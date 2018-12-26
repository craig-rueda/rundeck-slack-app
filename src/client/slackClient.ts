"use strict";

import rp from "request-promise";
import Promise from "bluebird";
import logger from "../util/logger";
import { DEPLOYMENT_CHANNEL_NAME, DEPLOYMENT_CHANNEL_WEBHOOK, RUNDECK_API_BASE_URL,
    RUNDECK_API_KEY, RUNDECK_JOB_ID_PRODUCTION, RUNDECK_JOB_ID_STAGING } from "../util/secrets";
import { IncomingWebhook, IncomingWebhookSendArguments } from "@slack/client";

export interface SlackClient {
    sendMessageToCallback(callbackUrl: string, msg: any): Promise<any>;
    sendMessageToDeploymentWebhook(msg: IncomingWebhookSendArguments): Promise<any>;
}

class SlackClientImpl implements SlackClient {
    deploymentSlackWh = new IncomingWebhook(DEPLOYMENT_CHANNEL_WEBHOOK);

    sendMessageToCallback = (callbackUrl: string, msg: any): Promise<any> => {
        return this.doPostToSlack(callbackUrl, msg);
    }

    sendMessageToDeploymentWebhook = (msg: IncomingWebhookSendArguments): Promise<any> => {
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

export default new SlackClientImpl() as SlackClient;
