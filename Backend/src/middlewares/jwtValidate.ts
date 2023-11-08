import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { MessageUtil } from "../utils/message";
import { RESPONSES, RES_MSG } from "../constant/response";
import config from "../config/configLocal";
import jwtSeizeModel from "../models/jwtSeize.model";
import userModel from "../models/user.model";

declare module "express" {
  interface Request {
    user: any;
  }
}

async function jwtValidate(request: Request, response: Response, next: NextFunction) {
  try {
    let expiredJwt = await jwtSeizeModel.findOne(
      {
       jwtToken: request?.headers?.authorization?.startsWith("Bearer ") ? String(request.headers.authorization).split(" ")[1] : request.headers.authorization, jwtStatus: "LOGGED_IN" 
      }
    )
    if (!expiredJwt) {
      return MessageUtil.error(response, {
        message: RES_MSG.UN_AUTHORIZED,
        error: true,
        status: RESPONSES.UN_AUTHORIZED,
      })
    }
    const jwtToken: any = request?.headers?.authorization?.startsWith("Bearer ") ? String(request.headers.authorization).split(" ")[1] : request.headers.authorization;
    const verify  = jwt.verify(jwtToken, String(config.JWT_SECRET))
    request.user = verify
    let user = await userModel.findOne({emailAddress: request.user.email})
    if(!user){
      return MessageUtil.error(response, {
        message: RES_MSG.UN_AUTHORIZED,
        error: true,
        status: RESPONSES.UN_AUTHORIZED,
      })
    }
    next()
  } catch (err: any) {
    return MessageUtil.error(response, {
      message: RES_MSG.UN_AUTHORIZED,
      error: true,
      status: RESPONSES.UN_AUTHORIZED,
    })
  }
}


export default jwtValidate