import express from "express";
import bodyParser from "body-parser";
import logger from "./util/logger";
import dotenv from "dotenv";
import path from "path";

// Controllers (route handlers)
// import * as homeController from "./controllers/home";
// import * as userController from "./controllers/user";
import * as slackController from "./controllers/slackController";
// import * as contactController from "./controllers/contact";


// API keys and Passport configuration
// import * as passportConfig from "./config/passport";

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * API examples routes.
 */
app.post("/slack/commands/deploy-latest-production", slackController.deployLatestProd);
app.post("/slack/commands/deploy-latest-staging", slackController.deployLatestStg);
app.post("/slack/actions", slackController.slackActions);

export default app;