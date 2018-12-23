"use strict";

import async from "async";
import request from "request";
import { Response, Request, NextFunction } from "express";
import { SlashBody } from "../models/SlackCallbacks"


/**
 * GET /api
 * List of API examples.
 */
export let deployLatest = (req: Request, res: Response) => {
  var slashBody = req.body as SlashBody;
  var responseUrl = slashBody.response_url;
  var token = slashBody.token;

  res.render("api/index", {
    title: "API Examples"
  });
};

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
