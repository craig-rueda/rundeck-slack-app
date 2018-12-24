import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: ".env" });
} else {
    logger.debug("Using .env.example file to supply config environment variables");
    dotenv.config({ path: ".env.example" });  // you can delete this after you create your own .env file!
}
export const ENVIRONMENT = process.env.NODE_ENV;
export const PROD = ENVIRONMENT === "production"; // Anything else is treated as 'dev'

export const SLACK_VERIFICATION_TOKEN = process.env["SLACK_VERIFICATION_TOKEN"];
if (!SLACK_VERIFICATION_TOKEN) {
    logger.error("No verification token secret. Set SLACK_VERIFICATION_TOKEN environment variable.");
    process.exit(1);
}

export const DEPLOYMENT_CHANNEL_NAME = process.env["DEPLOYMENT_CHANNEL_NAME"];
if (!DEPLOYMENT_CHANNEL_NAME) {
    logger.error("No deployment channel name. Set DEPLOYMENT_CHANNEL_NAME environment variable.");
    process.exit(1);
}

export const DEPLOYMENT_CHANNEL_WEBHOOK = process.env["DEPLOYMENT_CHANNEL_WEBHOOK"];
if (!DEPLOYMENT_CHANNEL_WEBHOOK) {
    logger.error("No deployment channel webhook. Set DEPLOYMENT_CHANNEL_WEBHOOK environment variable.");
    process.exit(1);
}

export const RUNDECK_API_KEY = process.env["RUNDECK_API_KEY"];
if (!RUNDECK_API_KEY) {
    logger.error("No rundeck API key. Set RUNDECK_API_KEY environment variable.");
    process.exit(1);
}

export const RUNDECK_API_BASE_URL = process.env["RUNDECK_API_BASE_URL"];
if (!RUNDECK_API_BASE_URL) {
    logger.error("No Rundeck base url. Set RUNDECK_API_BASE_URL environment variable.");
    process.exit(1);
}

export const RUNDECK_JOB_ID_PRODUCTION = process.env["RUNDECK_JOB_ID_PRODUCTION"];
if (!RUNDECK_JOB_ID_PRODUCTION) {
    logger.error("No production Rundeck job id. Set RUNDECK_JOB_ID_PRODUCTION environment variable.");
    process.exit(1);
}

export const RUNDECK_JOB_ID_STAGING = process.env["RUNDECK_JOB_ID_STAGING"];
if (!RUNDECK_JOB_ID_STAGING) {
    logger.error("No staging Rundeck job id. Set RUNDECK_JOB_ID_STAGING environment variable.");
    process.exit(1);
}
