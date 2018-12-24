"use strict";

import { ActionPayload, ButtonsRequest } from "../models/slack";
import logger from "../util/logger";
import { DEPLOYMENT_CHANNEL_NAME, RUNDECK_API_BASE_URL, 
    RUNDECK_API_KEY, RUNDECK_JOB_ID_PRODUCTION, RUNDECK_JOB_ID_STAGING } from "../util/secrets";
import rp from "request-promise";
import Promise from "bluebird";
import { Job, JobExecution, JobExecutions } from "../models/rundeck";

export enum TargetEnv {
    PROD = "production",
    STG = "staging"
}

const PROD_CALLBACK_ID = `deploy_${TargetEnv.PROD}`;
const STG_CALLBACK_ID = `deploy_${TargetEnv.STG}`;

enum DeployAction {
    ABORT = "abort",
    PROCEED = "proceed"
}

export interface SlackService {
    handleAction(slackAction: ActionPayload): Promise<any>;
    sendDeployResponse(targetEnv: TargetEnv, callbackUrl: string): Promise<any>;
}

class SlackServiceImpl implements SlackService {
    handleAction(slackAction: ActionPayload): Promise<any> {
        if (slackAction.actions[0].name == DeployAction.ABORT) {
            // Just send a bail-out message
            return this.doPostToSlack(slackAction.response_url, {
                "text": "Aborted...",
                "replace_original": true
            });
        }

        const rundeckJobId = slackAction.callback_id == PROD_CALLBACK_ID ? 
            RUNDECK_JOB_ID_PRODUCTION : RUNDECK_JOB_ID_STAGING;

        return this.checkJobRunning(rundeckJobId)
            .then((executions) => {
                let message = {
                    "text": `Triggering deployment job. Updates will be posted to #${DEPLOYMENT_CHANNEL_NAME}`,
                    "replace_original": true
                };

                if (executions.length !== 0) {
                    // This job is already running
                    message.text = `The requested deployment job is already running: ${executions[0].permalink}`
                }
                else {
                    message.text = `Triggering deployment job. Updates will be posted to #${DEPLOYMENT_CHANNEL_NAME}`;
                }

                return this.doPostToSlack(slackAction.response_url, message);
            });
    }

    sendDeployResponse(targetEnv: TargetEnv, callbackUrl: string): Promise<any> {
        let req : ButtonsRequest = { 
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

    doPostToSlack = (url: string, body: any): Promise<any> => {
        var postOptions = {
            uri: url,
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            json: body
          };
    
          return rp(postOptions)
            .catch((err) => {
              logger.error(err);
            });
    }

    checkJobRunning = (jobId: string): Promise<JobExecution[]> => {
        var getOptions = {
            uri: `${RUNDECK_API_BASE_URL}/api/16/job/${jobId}/executions?status=running`,
            method: "GET",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "X-Rundeck-Auth-Token": RUNDECK_API_KEY
            }
          };

        return rp(getOptions)
            .then((resp) => {
                let execs: JobExecutions = JSON.parse(resp);
                return execs.executions;
            })
            .catch((err) => {
              logger.error(err);
              throw err;
            });
    }

    doSubmitDeploymentJob = () => {

    }
}

export let service : SlackService = new SlackServiceImpl();