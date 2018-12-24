"use strict";

import { Response, Request, NextFunction } from "express";
import { ActionPayload, SlashPayload } from "../models/slack"
import { SLACK_VERIFICATION_TOKEN } from "../util/secrets";
import Promise from 'bluebird';
import { TargetEnv, service as slackService } from "../services/slackService";
import logger from "../util/logger";

export let deployLatestProd = (req: Request, res: Response) => {
  doDeploy(req, res, TargetEnv.PROD);
};

export let deployLatestStg = (req: Request, res: Response) => {
  doDeploy(req, res, TargetEnv.STG);
};

export let slackActions = (req: Request, res: Response) => {
  let payload = JSON.parse(req.body.payload) as ActionPayload;
  
  validateToken(payload.token, res)
    .then(() => {
      return slackService.handleAction(payload)
        .catch((err) => {
          // If something goes wrong, just let Slack know...
          res.status(500);
        });
    });
};

let doDeploy = (req: Request, res: Response, target: TargetEnv) => {
  var slashBody = req.body as SlashPayload;
  var responseUrl = slashBody.response_url;
  var token = slashBody.token;

  validateToken(token, res)
    .then(() => {
      return slackService.sendDeployResponse(target, responseUrl)
        .catch((err) => {
          // If something goes wrong, just let Slack know...
          res.status(500);
        });
    });
}

let validateToken = (token: String, res: Response): Promise<any> => {
  // Default to success
  res.status(200);

  return new Promise((resolve, reject) => {
    if (token === SLACK_VERIFICATION_TOKEN) {
      resolve();
    }
    else {
      res.status(403);
      reject();
    }
  })
  .finally(() => {
    res.end();
  });
}
