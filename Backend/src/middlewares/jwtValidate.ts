import { NextFunction ,Request,Response} from "express";
import jwt from "jsonwebtoken";
import { MessageUtil } from "../utils/message";
import { RESPONSES, RES_MSG } from "../constant/response";

declare module "express" {
    interface Request {
      user: any;
    }
  }
  
function jwtValidate (request:Request,response:Response,next:NextFunction){
    const jwtToken: any = request.headers.authorization
    try {
      const verify =  jwt.verify(jwtToken, request.body.emailAddress)
      request.user = verify
      next()
    } catch (err: any) {
        MessageUtil.error(response,{
          message: RES_MSG.UN_AUTHORIZED,
          error: true,
          status: RESPONSES.UN_AUTHORIZED,
          
        })
      }
}


export default jwtValidate