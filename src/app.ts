import express from "express";
import bodyParser from "body-parser";
// Controllers (route handlers)
import * as slackController from "./controllers/slackController";

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * API examples routes.
 */
app.post("/slack/commands/deploy-latest-production", slackController.deployLatestProd);
app.post("/slack/commands/deploy-latest-staging", slackController.deployLatestStg);
app.post("/slack/actions", slackController.slackActions);

export default app;