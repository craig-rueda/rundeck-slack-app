"use strict";

import { ActionPayload, ButtonsRequest } from "../models/slack";
import logger from "../util/logger";
import { DEPLOYMENT_CHANNEL_NAME, DEPLOYMENT_CHANNEL_WEBHOOK, RUNDECK_API_BASE_URL,
    RUNDECK_API_KEY, RUNDECK_JOB_ID_PRODUCTION, RUNDECK_JOB_ID_STAGING } from "../util/secrets";
import rp from "request-promise";
import Promise from "bluebird";
import { JobExecution, JobExecutions } from "../models/rundeck";
import { IncomingWebhook, IncomingWebhookSendArguments } from "@slack/client";
import { Set } from "immutable";
import moment from "moment";

export enum TargetEnv {
    PROD = "production",
    STG = "staging"
}

const PROD_CALLBACK_ID = `deploy_${TargetEnv.PROD}`;
const STG_CALLBACK_ID = `deploy_${TargetEnv.STG}`;
const ALL_JOB_IDS = Set<string>([RUNDECK_JOB_ID_PRODUCTION, RUNDECK_JOB_ID_STAGING]);

enum DeployAction {
    ABORT = "abort",
    PROCEED = "proceed"
}

export interface SlackService {
    handleAction(slackAction: ActionPayload): Promise<any>;
    sendDeployResponse(targetEnv: TargetEnv, callbackUrl: string): Promise<any>;
}

class SlackServiceImpl implements SlackService {
    runningExecutions: Set<number>;
    deploymentSlackWh = new IncomingWebhook(DEPLOYMENT_CHANNEL_WEBHOOK);

    constructor() {
        this.runningExecutions = Set<number>();
        setInterval(this.checkRunningJobs, 5000); // Update the set of watched jobs every 5s...
    }

    handleAction(slackAction: ActionPayload): Promise<any> {
        if (slackAction.actions[0].name == DeployAction.ABORT) {
            // Just send a bail-out message
            return this.doPostToSlack(slackAction.response_url, {
                "text": "Aborted...",
                "replace_original": true
            });
        }

        const rundeckJobId: string = slackAction.callback_id == PROD_CALLBACK_ID ?
            RUNDECK_JOB_ID_PRODUCTION : RUNDECK_JOB_ID_STAGING;
        const env: TargetEnv = slackAction.callback_id == PROD_CALLBACK_ID ?
            TargetEnv.PROD : TargetEnv.STG;

        return this.checkJobRunning(rundeckJobId)
            .then(executions => {
                if (executions.length !== 0) {
                    // This job is already running
                    return this.postCallbackMessage(
                        slackAction.response_url,
                        `The requested deployment job is already running: ${executions[0].permalink}`
                    );
                }
                else {
                    return this.doSubmitDeploymentJob(rundeckJobId)
                        .then(() => {
                            return this.postCallbackMessage(
                                slackAction.response_url,
                                `Triggering deployment job for ${env}. Updates will be posted to #${DEPLOYMENT_CHANNEL_NAME}`
                            );
                        })
                        .catch(() => {
                            return this.postCallbackMessage(
                                slackAction.response_url,
                                `Failed to submit deployment job to ${env}`
                            );
                        });
                }
            });
    }

    sendDeployResponse(targetEnv: TargetEnv, callbackUrl: string): Promise<any> {
        const req: ButtonsRequest = {
                text: `Promote latest staging release and deploy to ${targetEnv}?`,
                attachments: [
                    {
                        attachment_type: "default",
                        callback_id: targetEnv == TargetEnv.PROD ? PROD_CALLBACK_ID : STG_CALLBACK_ID,
                        color: "#00835B",
                        fallback: "Buttons aren't supported here...",
                        text: "Are you sure???",
                        actions: [
                            {
                                name: "proceed",
                                style: "danger",
                                text: "Proceed",
                                type: "button",
                                value: "proceed"
                            },
                            {
                                name: "abort",
                                text: "Abort",
                                type: "button",
                                value: "abort"
                            }
                        ]
                    }
                ]
            };

        return this.doPostToSlack(callbackUrl, req);
    }

    checkJobRunning = (jobId: string): Promise<JobExecution[]> => {
        return this.doTransactWithRundeck(`/api/16/job/${jobId}/executions?status=running`, "GET")
            .then(resp => {
                const execs: JobExecutions = JSON.parse(resp);
                return execs.executions;
            });
    }

    checkRunningJobs = (): void => {
        logger.debug("Checking for running jobs...");

        this.doTransactWithRundeck("/api/1/projects", "GET")
            .then(resp => {
                const projects = JSON.parse(resp) as any[];
                const ret = Promise.resolve();

                projects
                    .map(proj => proj.name)
                    .forEach(name => {
                        ret.then(() =>
                            this.doTransactWithRundeck(`/api/14/project/${name}/executions/running`, "GET")
                        )
                        .then(execResp =>
                            this.syncRunningJobs(JSON.parse(execResp) as JobExecutions)
                        );
                    });

                return ret;
            });
    }

    syncRunningJobs = (runningExecs: JobExecutions): Promise<any> => {
        // We only care about executions of our tracked jobs...
        const execs = runningExecs.executions.filter(exec => ALL_JOB_IDS.has(exec.job.id));
        // Now, find all the executions that we haven't already added to our list of "tracked" executions
        const newExecs = Set<JobExecution>(execs.filter(exec => !this.runningExecutions.has(exec.id)));

        // Need to map execs into their ids so that we can determine which executions have finished
        const execIds = Set<number>(execs.map(exec => exec.id));
        const finishedExecIds = Set<number>([...this.runningExecutions].filter(execId => !execIds.has(execId)));

        const ret = Promise.resolve();

        newExecs.forEach(exec => {
            this.runningExecutions = this.runningExecutions.add(exec.id);
            ret.then(() => this.postExecutionStatusToDeploymentChannel(exec))
                .error(logger.error);
        });

        finishedExecIds.forEach(execId => {
            this.runningExecutions = this.runningExecutions.delete(execId);

            // Since we only have the ID of the finished job execution, we need to resolve its details
            ret.then(() => this.doTransactWithRundeck(`/api/16/execution/${execId}`, "GET"))
                .then(resp => JSON.parse(resp) as JobExecution)
                .then(exec => this.postExecutionStatusToDeploymentChannel(exec))
                .error(logger.error);
        });

        return ret;
    }

    doSubmitDeploymentJob = (jobId: string): Promise<any> => {
        return this.doTransactWithRundeck(`/api/16/job/${jobId}/executions`, "POST", {});
    }

    doTransactWithRundeck = (path: string, verb: string, body?: any): Promise<any> => {
        const requestOptions = {
            uri: `${RUNDECK_API_BASE_URL}${path}`,
            method: verb,
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "X-Rundeck-Auth-Token": RUNDECK_API_KEY
            },
            json: body
          };

        return rp(requestOptions)
            .catch((err) => {
                logger.error(err);
                throw err;
            });
    }

    postCallbackMessage = (url: string, message: string): Promise<any> => {
        return this.doPostToSlack(url, { text: message, replace_original: true });
    }

    postExecutionStatusToDeploymentChannel = (exec: JobExecution): Promise<any> => {
        const text: string = `Execution #\`${exec.id}\` for the job \`${exec.job.name}\` has`
            + ` ${exec.status == "running" ? "started" : "completed"}`;
        const color: string = Set(["running", "succeeded"]).has(exec.status) ? "good" : "danger";

        const msg: IncomingWebhookSendArguments = {
            text: text,
            attachments: [
                {
                    text: `<!here> \n\n`,
                    color: color,
                    fields: [
                        {
                            short: false,
                            title: "Details",
                            value: exec.permalink
                        },
                        {
                            short: true,
                            title: "Started At",
                            value: moment(exec["date-started"].unixtime).format("ddd, MMM Do, h:mm:ss a")
                        },
                        {
                            short: true,
                            title: "Status",
                            value: exec.status
                        },
                        {
                            short: true,
                            title: "Average duration",
                            value: moment.duration(exec.job.averageDuration, "milliseconds").humanize()
                        }
                    ],
                    ts: "" + (new Date().getTime() / 1000)
                }
            ]
        };

        return Promise.resolve(this.deploymentSlackWh.send(msg));
    }

    doPostToSlack = (url: string, body: any): Promise<any> => {
        const postOptions = {
            uri: url,
            method: "POST",
            headers: {
                "Content-type": "application/json"
            },
            json: body
          };

        return rp(postOptions)
            .catch(err => {
                logger.error(err);
                throw err;
            });
    }
}

export const service: SlackService = new SlackServiceImpl();