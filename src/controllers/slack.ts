"use strict";

import { Response, Request, NextFunction } from "express";
import { SlashBody } from "../models/SlackCallbacks"
import { SLACK_VERIFICATION_TOKEN } from "../util/secrets";
import logger from "../util/logger"
import Promise from 'bluebird';
import rp from "request-promise";

enum TargetEnv {
  PROD,
  STG
}

export let deployLatestProd = (req: Request, res: Response) => {
  doDeploy(req, res, TargetEnv.PROD);
};

export let deployLatestStg = (req: Request, res: Response) => {
  doDeploy(req, res, TargetEnv.STG);
};

export let slackActions = (req: Request, res: Response) => {
  let payload = JSON.parse(req.body.payload);
};

let doDeploy = (req: Request, res: Response, target: TargetEnv) => {
  var slashBody = req.body as SlashBody;
  var responseUrl = slashBody.response_url;
  var token = slashBody.token;

  validateToken(token, res)
    .then(() => {
      var message = {
        "text": "This is your first interactive message",
        "attachments": [
            {
                "text": "Building buttons is easy right?",
                "fallback": "Shame... buttons aren't supported in this land",
                "callback_id": "button_tutorial",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "yes",
                        "text": "yes",
                        "type": "button",
                        "value": "yes"
                    },
                    {
                        "name": "no",
                        "text": "no",
                        "type": "button",
                        "value": "no"
                    },
                    {
                        "name": "maybe",
                        "text": "maybe",
                        "type": "button",
                        "value": "maybe",
                        "style": "danger"
                    }
                ]
            }
        ]
      };
      var postOptions = {
        uri: responseUrl,
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        json: message
      }

      rp(postOptions)
        .catch((err) => {
          logger.log('error', err);
        });
    });
}

let validateToken = (token: String, res: Response) => {
  return new Promise((resolve, reject) => {
    if (token === SLACK_VERIFICATION_TOKEN) {
      resolve();
    }
    else {
      res.status(403);
      reject();
    }
  });
}

/**
 * GET /api/facebook
 * Facebook API example.
 */
// export let getFacebook = (req: Request, res: Response, next: NextFunction) => {
//   const token = req.user.tokens.find((token: any) => token.kind === "facebook");
//   graph.setAccessToken(token.accessToken);
//   graph.get(`${req.user.facebook}?fields=id,name,email,first_name,last_name,gender,link,locale,timezone`, (err: Error, results: graph.FacebookUser) => {
//     if (err) { return next(err); }
//     res.render("api/facebook", {
//       title: "Facebook API",
//       profile: results
//     });
//   });
// };
