"use strict";

import Promise from "bluebird";
import { Set } from "immutable";
import moment from "moment";
import _ from "lodash";
import { IncomingWebhookSendArguments } from "@slack/client";

import { ActionPayload, ButtonsRequest } from "../models/slack";
import logger from "../util/logger";
import { DEPLOYMENT_CHANNEL_NAME, RUNDECK_JOB_ID_PRODUCTION, RUNDECK_JOB_ID_STAGING, JOB_EXEC_SYNC_INTERVAL_MS } from "../util/secrets";
import { JobExecution } from "../models/rundeck";
import rundeckClient from "../client/rundeckClient";
import slackClient from "../client/slackClient";

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
    checkRunningJobs(): void;
}

class SlackServiceImpl implements SlackService {
    runningExecutions: Set<number>;

    constructor() {
        this.runningExecutions = Set<number>();

        if (JOB_EXEC_SYNC_INTERVAL_MS) {
            setInterval(this.checkRunningJobs, JOB_EXEC_SYNC_INTERVAL_MS);
        }
    }

    handleAction(slackAction: ActionPayload): Promise<any> {
        if (slackAction.actions[0].name == DeployAction.ABORT) {
            // Just send a bail-out message
            return this.postCallbackMessage(slackAction.response_url, "Aborted...");
        }

        const rundeckJobId: string = slackAction.callback_id == PROD_CALLBACK_ID ?
            RUNDECK_JOB_ID_PRODUCTION : RUNDECK_JOB_ID_STAGING;
        const env: TargetEnv = slackAction.callback_id == PROD_CALLBACK_ID ?
            TargetEnv.PROD : TargetEnv.STG;

        return rundeckClient.getRunningExecutionsForJob(rundeckJobId)
            .then(exec => exec.executions)
            .then(executions => {
                if (executions.length !== 0) {
                    // This job is already running
                    return this.postCallbackMessage(
                        slackAction.response_url,
                        `The requested deployment job is already running: ${executions[0].permalink}`
                    );
                }
                else {
                    return rundeckClient.triggerJobExecution(rundeckJobId)
                        .then(() => {
                            return this.postCallbackMessage(
                                slackAction.response_url,
                                `Triggering deployment job for ${env}. Updates will be posted to #${DEPLOYMENT_CHANNEL_NAME}`
                            );
                        })
                        .catch((err) => {
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

        return slackClient.sendMessageToCallback(callbackUrl, req);
    }

    checkRunningJobs = (): void => {
        logger.debug("Checking for running jobs...");

        // Compose promises from fetching running executions of all jobs that we're watching
        Promise.all(
                ALL_JOB_IDS.map(rundeckClient.getRunningExecutionsForJob)
            )
            // Pull out the JobExecution[] array
            .map(execs => execs.executions)
            // Convert JobExecution[][] => flattened JobExecutions[]
            .then(executions => _.flatMap(executions))
            .then(execs => this.doSyncRunningJobs(execs));
    }

    doSyncRunningJobs = (runningExecs: JobExecution[]): Promise<any> => {
        // We only care about executions of our tracked jobs...
        const execs = runningExecs.filter(exec => ALL_JOB_IDS.has(exec.job.id));
        // Now, find all the executions that we haven't already added to our list of "tracked" executions
        const newExecs = Set<JobExecution>(execs.filter(exec => !this.runningExecutions.has(exec.id)));

        // Need to map execs into their ids so that we can determine which executions have finished
        const execIds = Set<number>(execs.map(exec => exec.id));
        const finishedExecIds = Set<number>([...this.runningExecutions].filter(execId => !execIds.has(execId)));

        let allPromises = Set();

        newExecs.forEach(exec => {
            this.runningExecutions = this.runningExecutions.add(exec.id);
            allPromises = allPromises.add(
                this.postExecutionStatusToDeploymentChannel(exec)
            );
        });

        finishedExecIds.forEach(execId => {
            this.runningExecutions = this.runningExecutions.delete(execId);

            // Since we only have the ID of the finished job execution, we need to resolve its details
            allPromises = allPromises.add(
                rundeckClient.getExecutionById(execId)
                    .then(exec => this.postExecutionStatusToDeploymentChannel(exec))
            );
        });

        return Promise.all(allPromises).error(logger.error);
    }

    postCallbackMessage = (url: string, message: string): Promise<any> => {
        return slackClient.sendMessageToCallback(url, { text: message, replace_original: true });
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

        return slackClient.sendMessageToDeploymentWebhook(msg);
    }
}

export const service: SlackService = new SlackServiceImpl();