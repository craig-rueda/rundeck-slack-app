"use strict";

import rp from "request-promise";
import Promise from "bluebird";
import logger from "../util/logger";
import { DEPLOYMENT_CHANNEL_NAME, DEPLOYMENT_CHANNEL_WEBHOOK, RUNDECK_API_BASE_URL,
    RUNDECK_API_KEY, RUNDECK_JOB_ID_PRODUCTION, RUNDECK_JOB_ID_STAGING } from "../util/secrets";
import { JobExecution, JobExecutions } from "../models/rundeck";

export interface RundeckClient {
    getRunningExecutionsForJob(jobId: string): Promise<JobExecutions>;
    getExecutionById(execId: number): Promise<JobExecution>;
    triggerJobExecution(jobId: string): Promise<JobExecution>;
}

class RundeckClientImpl implements RundeckClient {
    getRunningExecutionsForJob = (jobId: string): Promise<JobExecutions> => {
        return this.doTransactWithRundeck(`/api/16/job/${jobId}/executions?status=running`, "GET");
    }

    getExecutionById = (execId: number): Promise<JobExecution> => {
        return this.doTransactWithRundeck(`/api/16/execution/${execId}`, "GET");
    }

    triggerJobExecution = (jobId: string): Promise<JobExecution> => {
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
          .then(resp => JSON.parse(resp))
          .catch((err) => {
            logger.error(err);
            throw err;
          }
        );
    }
}

export default new RundeckClientImpl() as RundeckClient;