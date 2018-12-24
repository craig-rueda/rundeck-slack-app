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
