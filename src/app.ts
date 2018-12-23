import express from "express";
import bodyParser from "body-parser";
import logger from "./util/logger";
import dotenv from "dotenv";
import path from "path";
import { MONGODB_URI, SESSION_SECRET } from "./util/secrets";

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env.example" });

// Controllers (route handlers)
// import * as homeController from "./controllers/home";
// import * as userController from "./controllers/user";
import * as apiController from "./controllers/slack";
// import * as contactController from "./controllers/contact";


// API keys and Passport configuration
// import * as passportConfig from "./config/passport";

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * API examples routes.
 */
app.post("/slack/deploy_latest_prod", apiController.deployLatest);

export default app;