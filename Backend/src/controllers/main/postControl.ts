import { Request, Response } from "express";
import postsModel from "../../models/posts.model";
import Joi from "joi";
import { MessageUtil } from "../../utils/message";
import { RESPONSES, RES_MSG } from "../../constant/response";
import userModel from "../../models/user.model";
import jobsModel from "../../models/jobs.model";
import config from "../../config/configLocal";
import Sort from "lodash";
import polkadotFunctionHelper from "../../helpers/polkadotFunctionHelper";

class postAudit {
  // This function handles the registration of an audit.
  public async registerAudit(req: Request, res: Response) {
    try {
      // Define a Joi schema to validate the request data.
      const schema = Joi.object({
        auditType: Joi.array()
          .items(Joi.string().trim())
          .required()
          .error(new Error("Invalid Audit Type")),
        gitHub: Joi.string()
          .trim()
          .required()
          .pattern(
            /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:tree|blob|releases)\/[A-Za-z0-9_.-\/-]+$/
          )
          .error(new Error("Invalid GitHub link")),
        offerAmount: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid Offer Amount")),
        estimatedDelivery: Joi.string()
          .trim()
          .required()
          .pattern(/^(0[1-9]|[1-2]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/)
          .error(new Error("Invalid Date Format")), //DD/MM/YYYY
        description: Joi.string().trim().required(),
        socialLink: Joi.string().trim().required(),
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        salt: Joi.number()
          .required()
          .error(new Error("A unique Salt must be provided")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      // Replace this with your input date string in the "DD/MM/YYYY" format
      const inputDateString = req.body.estimatedDelivery;
      // Split the date string into day, month, and year parts
      const [day, month, year] = inputDateString.split("/");
      // Create a new Date object using the parsed values (months are 0-based in JavaScript)
      const dateObject = new Date(year, month - 1, day);
      // Convert the Date object to a timestamp using Date.getTime() and then divide by 1000 to get seconds
      const timestamp = dateObject.getTime();
      if (timestamp < Date.now()) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: RES_MSG.DATE_TRESPASSED,
        };
      }
      // Check if the user exists in the database based on the provided email address.
      const userData = await userModel.findOne({
        emailAddress: req.user.email,
      });
      if (userData) {
        // If the user exists, create a new audit post using the provided data.
        await postsModel
          .create({
            emailAddress: req.user.email.toLowerCase(),
            status: "PRE_REGISTERATION",
            auditType: req.body.auditType,
            gitHub: req.body.gitHub,
            offerAmount: Number(String(req.body.offerAmount).trim()),
            postID: Math.trunc(Math.random() * 100000),
            estimatedDelivery: timestamp,
            description: req.body.description,
            socialLink: req.body.socialLink,
            salt: req.body.salt,
          })
          .then((response) => {
            // Return a success response with the created audit post and user's first name and last name.
            MessageUtil.success(res, {
              message: RES_MSG.PRE_REGISTERED,
              status: RESPONSES.SUCCESS,
              error: false,
              data: {
                response,
                firstName: userData.firstName,
                lastName: userData.lastName,
              },
            });
          })
          .catch((err) => {
            // If there is an error during the database create operation, return an error response with the appropriate message.
            MessageUtil.error(res, {
              message: err?.message || RES_MSG.BADREQUEST,
              status: RESPONSES.BADREQUEST,
              error: true,
            });
          });
      } else {
        // If the user does not exist, return an error response.
        return MessageUtil.error(res, {
          message: RES_MSG.BADREQUEST,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
    } catch (error: any) {
      // Catch any errors that occurred during the registration process and return an error response.
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async confirmPost(req: Request, res: Response) {
    try {
      let schema = Joi.object({
        txHash: Joi.string()
          .required()
          .error(new Error("No transaction hash ")),
        salt: Joi.number()
          .required()
          .error(new Error("A unique Salt must be provided")),
        currentAuditId: Joi.number()
          .required()
          .error(new Error("Invalid currentAuditId")),
      });
      let { error } = schema.validate(req.body);
      if (error) {
        throw {
          message: error.message,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
      let obj = {
        txHash: req.body.txHash,
        status: "PENDING",
        currentAuditId: req.body.currentAuditId,
      };
      let paymentInfo = await polkadotFunctionHelper.getPaymentInfo(req.body.currentAuditId);
      if(paymentInfo.status != "AuditCreated"){
        return MessageUtil.error(res,{
          message:RES_MSG.VALIDATION_FAILED_FROM_SMART_CONTRACT,
          error: true,
          status: RESPONSES.BADREQUEST
        })
      }
      let response = await postsModel.findOneAndUpdate(
        {
          salt: req.body.salt,
          status: "PRE_REGISTERATION",
        },
        {
          $set: obj,
        },
        {
          returnOriginal: false,
        }
      );
      return MessageUtil.success(res, {
        message: RES_MSG.POST_REGISTERED,
        status: RESPONSES.SUCCESS,
        error: false,
        data: response,
      });
    } catch (error) {
      // Catch any errors that occurred during the registration process and return an error response.
      MessageUtil.error(res, {
        message: RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async deleteBidRequest(req: Request, res:Response){
    try{
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid POST ID")),
        bidderToDecline: Joi.string().required().email().error(new Error("Bidder email validation failed"))
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          message: error.message,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
      let bidderRequest = await jobsModel.findOneAndUpdate({
                    emailAddress: req.body.bidderToDecline.toLowerCase(),
                    postID: req.body.postID,
                    posterEmailAddress: req.user.email,
                    status: "PENDING",
                    isRejected: false
                  },
                  {
                    $set: {
                      isRejected: true
                    }
                  },
                  {
                    returnOriginal: false
                  })
    if(bidderRequest){
      return MessageUtil.success(res,{
        status: RESPONSES.SUCCESS,
        error: false,
        data: bidderRequest 
      })
    }
    }
    catch(error){
      MessageUtil.error(res, {
        message: RES_MSG.BADREQUEST,
        error: false,
        status: RESPONSES.BADREQUEST,
      });
    }
  }

  public async getBidsOfMyRequest(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid POST ID")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          message: error.message,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
      const query = await postsModel.findOne({
        postID: req.body.postID,
        emailAddress: req.user.email,
      });
      if(query == undefined || query == null){
        return MessageUtil.error(res, {
          message: RES_MSG.BADREQUEST,
          status: RESPONSES.BADREQUEST,
          error: true
        });
      }
      if (query?.status == "PENDING") {
        let response: any = await jobsModel.find({ postID: req.body.postID, status: "PENDING", isRejected: false });
        let a = await response.map(async (e: any) => {
          const userData: any = await userModel.findOne({
            emailAddress: e?.emailAddress,
          });
          return {
            emailAddress: userData.emailAddress,
            walletAddress: userData.walletAddress != undefined ? userData.walletAddress : "",
            profilePicture: userData.profilePicture,
            bidderEmail: e?.emailAddress,
            estimatedAmount: e?.estimatedAmount,
            estimatedDelivery: e?.estimatedDelivery,
            postID: e?.postID,
            currentAuditID: query.currentAuditId != undefined? query.currentAuditId : "",
            submit: query.submit != null? query.submit : "",
            posterEmailAddress: e?.posterEmailAddress,
            firstName: userData.firstName,
            lastName: userData.lastName != null? userData.lastName : "",
            status: e?.status,
            arbStatus: query?.status === "UNDER_ARBITERATION" ? true : false,
            gitHub: userData.gitHub,
            linkedIn: userData.linkedIn,
            telegram: userData.telegram,
            bio: userData.bio,
            postedAt: e?.updatedAt,
          };
        });

        let final = await Promise.all(a);
        MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          data: final.reverse(),
        });
      }
      else{
        if(query){
        let response: any = await jobsModel.find({ postID: req.body.postID, status: "CONFIRM"});
        let a = await response.map(async (e: any) => {
          const userData: any = await userModel.findOne({
            emailAddress: e?.emailAddress,
          });
          return {
            emailAddress: userData.emailAddress,
            walletAddress: userData.walletAddress != undefined ? userData.walletAddress : "",
            profilePicture: userData.profilePicture,
            bidderEmail: e?.emailAddress,
            estimatedAmount: e?.estimatedAmount,
            estimatedDelivery: e?.estimatedDelivery,
            postID: e?.postID,
            currentAuditID: query.currentAuditId != undefined? query.currentAuditId : "",
            submit: query.submit != null? query.submit : "",
            posterEmailAddress: e?.posterEmailAddress,
            firstName: userData.firstName,
            lastName: userData.lastName != null? userData.lastName : "",
            status: e?.status,
            arbStatus: query?.status === "UNDER_ARBITERATION" ? true : false,
            gitHub: userData.gitHub,
            linkedIn: userData.linkedIn,
            telegram: userData.telegram,
            bio: userData.bio,
            postedAt: e?.updatedAt,
          };
        });

        let final = await Promise.all(a);
        MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          data: final,
        });
      }
    }
    } catch (error) {
      MessageUtil.error(res, {
        message: RES_MSG.BADREQUEST,
        error: false,
        status: RESPONSES.BADREQUEST,
      });
    }
  }

  public async updateSalt(req: Request, res: Response) {
    try {
      const emailAddress = req.user.email.toLowerCase();
      // Define a Joi schema to validate the request data.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required().error(new Error("Invalid post ID")),
        salt: Joi.number()
          .required()
          .error(new Error("A unique Salt must be provided")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };

      const query = await postsModel.findOne({
        postID: req.body.postID,
        status: "SUBMITTED",
        emailAddress: emailAddress,
      });
      if (query) {
        // Find the auditor by their email address in the database.
        const a: any = await userModel.find({
          emailAddress: query.auditorEmail,
        });
        // If the auditor is not found in the database, throw an error indicating that the auditor was not found.
        if (a.length == 0) {
          throw {
            status: RESPONSES.BADREQUEST,
            error: true,
            message: RES_MSG.AUDITOR_NOT_FOUND,
          };
        }
        // Update the audit post with the new auditor's email address.
        let response = await postsModel.findOneAndUpdate(
          {
            emailAddress: emailAddress,
            postID: req.body.postID,
          },
          {
            $set: {
              salt: req.body.salt,
            },
          },
          {
            returnOriginal: false,
          }
        );
        // Return a success response with the updated audit post data.
        MessageUtil.success(res, {
          message: RES_MSG.SUCCESS,
          status: RESPONSES.SUCCESS,
          error: false,
          data: response,
        });
      } else {
        // If there is an error during the database update, return an error response with the appropriate message.
        MessageUtil.error(res, {
          message: RES_MSG.POST_ID_MISMATCHED,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
    } catch (error: any) {
      // Catch any errors that occurred during the update process and return an error response.
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function updates the auditor's email address for a specific audit post.
  public async updateAuditorID(req: Request, res: Response) {
    try {
      const emailAddress = req.user.email.toLowerCase();
      // Define a Joi schema to validate the request data.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required().error(new Error("Invalid post ID")),
        auditorEmail: Joi.string()
          .required()
          .email()
          .error(new Error("auditorEmail validation failed")),
        salt: Joi.number()
          .required()
          .error(new Error("A unique Salt must be provided")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };

      const query = await postsModel.findOne({
        postID: req.body.postID,
        status: { $in: ["PENDING"] },
        emailAddress: emailAddress,
      });
      if (query) {
        // Find the auditor by their email address in the database.
        const a: any = await userModel.find({
          emailAddress: req.body.auditorEmail,
        });
        // If the auditor is not found in the database, throw an error indicating that the auditor was not found.
        if (a.length == 0) {
          throw {
            status: RESPONSES.BADREQUEST,
            error: true,
            message: RES_MSG.AUDITOR_NOT_FOUND,
          };
        }
        const auditorData = await jobsModel.findOne({
          postID: req.body.postID,
          status: { $in: ["PENDING"] },
          emailAddress: req.body.auditorEmail,
        });
        // Update the audit post with the new auditor's email address.
        let response = await postsModel.findOneAndUpdate(
          { postID: req.body.postID },
          {
            $set: {
              auditorEmail: req.body.auditorEmail.toLowerCase(),
              salt: req.body.salt
            },
          },
          {
            returnOriginal: false,
          }
        );
        // Return a success response with the updated audit post data.
        MessageUtil.success(res, {
          message: RES_MSG.SUCCESS,
          status: RESPONSES.SUCCESS,
          error: false,
          data: response,
        });
      } else {
        // If there is an error during the database update, return an error response with the appropriate message.
        MessageUtil.error(res, {
          message: RES_MSG.POST_ID_MISMATCHED,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
    } catch (error: any) {
      // Catch any errors that occurred during the update process and return an error response.
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async updateAuditStatus(req: Request, res: Response) {
    try {
      const emailAddress = req.user.email.toLowerCase();
      // Define a Joi schema to validate the request data.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required().error(new Error("Invalid post ID")),
        status: Joi.string()
          .trim()
          .required()
          .error(new Error("Invalid Status Provided")),
        txHash: Joi.string()
          .required()
          .error(new Error("No transaction hash ")),
        salt: Joi.number()
          .required()
          .error(new Error("A unique Salt must be provided")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      const query : any = await postsModel.findOne({
        postID: req.body.postID,
        status: { $in: ["PENDING", "SUBMITTED"] },
        emailAddress: emailAddress,
        salt: req.body.salt,
      });
      if (query) {
        if(query.status == "PENDING"){
          let paymentInfo = await polkadotFunctionHelper.getPaymentInfo(query?.currentAuditId);
          if(paymentInfo.status != "AuditAssigned"){
            return MessageUtil.error(res,{
              message:RES_MSG.VALIDATION_FAILED_FROM_SMART_CONTRACT,
              error: true,
              status: RESPONSES.BADREQUEST
            })
          }
        }
        else{
          if(query.status == "SUBMITTED"){
            let paymentInfo = await polkadotFunctionHelper.getPaymentInfo(query?.currentAuditId);
            if(paymentInfo.status != "AuditCompleted"){
              return MessageUtil.error(res,{
                message:RES_MSG.VALIDATION_FAILED_FROM_SMART_CONTRACT,
                error: true,
                status: RESPONSES.BADREQUEST
              })
            }
          }
        }
        const auditorData = await jobsModel.findOne({
          postID: req.body.postID,
          status: { $in: ["PENDING"] },
          emailAddress: query.auditorEmail,
        });
        let obj: any = {
              txhash: req.body.txHash,
              salt: req.body.salt,
              status: req.body.status,
              offerAmount: auditorData?.estimatedAmount,
              estimatedDelivery: auditorData?.estimatedDelivery,
        }
        // Update the audit post with the provided status if the post exists and its current status is either "PENDING" or "SUBMITTED".
        const response = await postsModel.findOneAndUpdate(
          {
            postID: req.body.postID,
            status: { $in: ["PENDING", "SUBMITTED"] },
            emailAddress: emailAddress,
            salt: req.body.salt,
          },
          {
            $set: obj,
          },
          {
            returnOriginal: false,
          }
        );
        // Return a success response with the updated audit post data.
        MessageUtil.success(res, {
          message: RES_MSG.SUCCESS,
          status: RESPONSES.SUCCESS,
          error: false,
          data: response,
        });
      } else {
        // If there is an error during the database update, return an error response with the appropriate message.
        MessageUtil.error(res, {
          message: RES_MSG.POST_ID_MISMATCHED,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
    } catch (error: any) {
      // Catch any errors that occurred during the update process and return an error response.
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }


  public async updateAuditStatusAfterClaim(req: Request, res: Response) {
    try {
      const emailAddress = req.user.email.toLowerCase();
      // Define a Joi schema to validate the request data.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required().error(new Error("Invalid post ID")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      const query: any = await postsModel.findOne({
        postID: req.body.postID,
        status: { $in: ["PENDING", "IN_PROGRESS"] },
        emailAddress: emailAddress,
      });
      if (query) {
        // Update the audit post with the provided status if the post exists and its current status is either "PENDING" or "SUBMITTED".
        const response = await postsModel.findOneAndUpdate(
          {
            postID: req.body.postID,
            status:  { $in: ["PENDING", "IN_PROGRESS"]},
          },
          {
            $set: {status: "FAILED"},
          },
          {
            returnOriginal: false,
          }
        );
        // Return a success response with the updated audit post data.
        MessageUtil.success(res, {
          message: RES_MSG.SUCCESS,
          status: RESPONSES.SUCCESS,
          error: false,
          data: response,
        });
      } 
      else {
        // If there is an error during the database update, return an error response with the appropriate message.
        MessageUtil.error(res, {
          message: RES_MSG.POST_ID_MISMATCHED,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
    } catch (error: any) {
      // Catch any errors that occurred during the update process and return an error response.
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async getDetailsOfAllAuditsPublic(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .lowercase()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
      });
      const { error } = schema.validate(req.body);
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      const {
        page,
        limit,
        search,
        sort,
        reverse,
        offerAmountLower,
        offerAmountHigher,
        requiredAuditType,
      }: any = req.query;
      let initialPage = page ? page : 1;
      let initialLimit = limit ? limit : 10;
      let limitOffset: any = (Number(initialPage) - 1) * Number(initialLimit);
      let response: any = [];
      let responseCount: any;
      let setOfferAmountLower = offerAmountLower ? Number(offerAmountLower) : 0;
      let setOfferAmountHigher = offerAmountHigher
        ? Number(offerAmountHigher)
        : 10000000000000000;
      let defaultVal: any = ["Smart Contract Audit", "Penetration Testing"];
      let setRequiredAuditType: any = requiredAuditType
        ? requiredAuditType
        : defaultVal;
      if (requiredAuditType != undefined) {
        switch (Number(requiredAuditType)) {
          case 1:
            setRequiredAuditType = [
              "Penetration Testing",
              "Smart Contract Audit",
            ];
            break;
          case 2:
            setRequiredAuditType = [
              "Penetration Testing",
              "Performance Testing",
            ];
            break;
          case 3:
            setRequiredAuditType = [
              "Smart Contract Audit",
              "Performance Testing",
            ];
            break;
          case 4:
            setRequiredAuditType = ["Smart Contract Audit"];
            break;
          case 5:
            setRequiredAuditType = ["Performance Testing"];
            break;
          case 6:
            setRequiredAuditType = ["Penetration Testing"];
            break;
          default:
            break;
        }
      } else if (requiredAuditType == undefined) {
        setRequiredAuditType = [
          "Penetration Testing",
          "Smart Contract Audit",
          "Performance Testing",
        ];
      }
      const s: Number = Number(search);
      if (search && search.trim()) {
        const query = {
          $or: [
            { auditType: { $regex: new RegExp(search, "i") } },
            { status: { $regex: new RegExp(search, "i") } },
            { emailAddress: new RegExp(search, "i") },
            { auditorEmail: { $regex: new RegExp(search, "i") } },
            { gitHub: { $regex: new RegExp(search, "i") } },
            { amt: { $regex: new RegExp(search, "i") } },
            { pId: { $regex: new RegExp(search, "i") } },
          ],
        };
        response = await postsModel.aggregate([
          {
            $addFields: {
              amt: { $toString: "$offerAmount" },
              pId: { $toString: "$postID" },
            },
          },
          {
            $match: {
              $and: [
                {
                  status: { $ne: "PRE_REGISTERATION" },
                  $expr: {
                    $and: [
                      { $gt: ["$offerAmount", Number(setOfferAmountLower)] }, // Greater than 10
                      { $lt: ["$offerAmount", Number(setOfferAmountHigher)] }, // Less than 20
                    ],
                  },
                  auditType: { $in: setRequiredAuditType },
                },
                query,
              ],
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: Number(limitOffset) },
          { $limit: Number(initialLimit) },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              emailAddress: 1,
              status: 1,
              auditType: 1,
              gitHub: 1,
              amt: 1,
              pId: 1,
              offerAmount: 1,
              postID: 1,
              estimatedDelivery: 1,
              description: 1,
              socialLink: 1,
              auditorEmail: 1,
              currentAuditId: 1,
              submit: 1,
              profilePicture: "$users.profilePicture",
              createdAt: 1,
            },
          },
        ]);
        responseCount = await postsModel.aggregate([
          {
            $addFields: {
              amt: { $toString: "$offerAmount" },
              pId: { $toString: "$postID" },
            },
          },
          {
            $match: {
              $and: [
                {
                  status: { $ne: "PRE_REGISTERATION" },
                  $expr: {
                    $and: [
                      { $gt: ["$offerAmount", Number(setOfferAmountLower)] }, // Greater than 10
                      { $lt: ["$offerAmount", Number(setOfferAmountHigher)] }, // Less than 20
                    ],
                  },
                  auditType: { $in: setRequiredAuditType },
                },
                query,
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              emailAddress: 1,
              status: 1,
              auditType: 1,
              gitHub: 1,
              amt: 1,
              pId: 1,
              offerAmount: 1,
              postID: 1,
              estimatedDelivery: 1,
              description: 1,
              socialLink: 1,
              auditorEmail: 1,
              currentAuditId: 1,
              submit: 1,
              profilePicture: "$users.profilePicture",
              createdAt: 1,
            },
          },
        ]);
      } else {
        responseCount = await postsModel.aggregate([
          {
            $match: {
              $and: [
                {
                  status: { $ne: "PRE_REGISTERATION" },
                  $expr: {
                    $and: [
                      { $gt: ["$offerAmount", Number(setOfferAmountLower)] }, // Greater than 10
                      { $lt: ["$offerAmount", Number(setOfferAmountHigher)] }, // Less than 20
                    ],
                  },
                  auditType: { $in: setRequiredAuditType },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              emailAddress: 1,
              status: 1,
              auditType: 1,
              gitHub: 1,
              offerAmount: 1,
              postID: 1,
              estimatedDelivery: 1,
              description: 1,
              socialLink: 1,
              auditorEmail: 1,
              currentAuditId: 1,
              submit: 1,
              profilePicture: "$users.profilePicture",
              createdAt: 1,
            },
          },
        ]);
        response = await postsModel.aggregate([
          {
            $match: {
              $and: [
                {
                  status: { $ne: "PRE_REGISTERATION" },
                  $expr: {
                    $and: [
                      { $gt: ["$offerAmount", Number(setOfferAmountLower)] }, // Greater than 10
                      { $lt: ["$offerAmount", Number(setOfferAmountHigher)] }, // Less than 20
                    ],
                  },
                  auditType: { $in: setRequiredAuditType },
                },
              ],
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: Number(limitOffset) },
          { $limit: Number(initialLimit) },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              emailAddress: 1,
              status: 1,
              auditType: 1,
              gitHub: 1,
              offerAmount: 1,
              postID: 1,
              estimatedDelivery: 1,
              description: 1,
              socialLink: 1,
              auditorEmail: 1,
              currentAuditId: 1,
              submit: 1,
              profilePicture: "$users.profilePicture",
              createdAt: 1,
            },
          },
        ]);
      }
      let final;
      if (sort) {
        if (reverse == false) {
          final = Sort.sortBy(response, sort);
        } else {
          final = Sort.sortBy(response, sort).reverse();
        }
      } else {
        final = response;
      }

      MessageUtil.success(res, {
        message: RES_MSG.SUCCESS,
        status: RESPONSES.SUCCESS,
        error: false,
        pages: Math.ceil(responseCount.length / initialLimit),
        count: responseCount.length,
        docCount: final.length,
        data: final,
      });
    } catch (error: any) {
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async getDetailsOfAllAudits(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .lowercase()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
      });
      const { error } = schema.validate(req.body);
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      const {
        page,
        limit,
        search,
        sort,
        reverse,
        offerAmountLower,
        offerAmountHigher,
        requiredAuditType,
      }: any = req.query;
      let initialPage = page ? page : 1;
      let initialLimit = limit ? limit : 10;
      let limitOffset: any = (Number(initialPage) - 1) * Number(initialLimit);
      let response: any = [];
      let responseCount;
      let setOfferAmountLower = offerAmountLower ? Number(offerAmountLower) : 0;
      let setOfferAmountHigher = offerAmountHigher
        ? Number(offerAmountHigher)
        : 10000000000000000;
      let defaultVal: any = ["Smart Contract Audit", "Penetration Testing"];
      let setRequiredAuditType: any = requiredAuditType
        ? requiredAuditType
        : defaultVal;
      if (requiredAuditType != undefined) {
        switch (Number(requiredAuditType)) {
          case 1:
            setRequiredAuditType = [
              "Penetration Testing",
              "Smart Contract Audit",
            ];
            break;
          case 2:
            setRequiredAuditType = [
              "Penetration Testing",
              "Performance Testing",
            ];
            break;
          case 3:
            setRequiredAuditType = [
              "Smart Contract Audit",
              "Performance Testing",
            ];
            break;
          case 4:
            setRequiredAuditType = ["Smart Contract Audit"];
            break;
          case 5:
            setRequiredAuditType = ["Performance Testing"];
            break;
          case 6:
            setRequiredAuditType = ["Penetration Testing"];
            break;
          default:
            break;
        }
      } else if (requiredAuditType == undefined) {
        setRequiredAuditType = [
          "Penetration Testing",
          "Smart Contract Audit",
          "Performance Testing",
        ];
      }
      const s: Number = Number(search);
      if (search && search.trim()) {
        const query = {
          $or: [
            { auditType: { $regex: new RegExp(search, "i") } },
            { status: { $regex: new RegExp(search, "i") } },
            { emailAddress: new RegExp(search, "i") },
            { auditorEmail: { $regex: new RegExp(search, "i") } },
            { gitHub: { $regex: new RegExp(search, "i") } },
            { amt: { $regex: new RegExp(search, "i") } },
            { pId: { $regex: new RegExp(search, "i") } },
          ],
        };
        response = await postsModel.aggregate([
          {
            $addFields: {
              amt: { $toString: "$offerAmount" },
              pId: { $toString: "$postID" },
              EmailAddress: req.user.email.toLowerCase(),
            },
          },
          {
            $match: {
              $and: [
                {
                  $or: [
                    { emailAddress: req.user.email.toLowerCase() },
                    {
                      $and: [
                        { auditorEmail: req.user.email.toLowerCase() },
                        { status : {$ne: "PENDING"} },
                      ]
                    }
                  ],
                  status: { $ne: "PRE_REGISTERATION" },
                  $expr: {
                    $and: [
                      { $gt: ["$offerAmount", Number(setOfferAmountLower)] }, // Greater than 10
                      { $lt: ["$offerAmount", Number(setOfferAmountHigher)] }, // Less than 20
                    ],
                  },
                  auditType: { $in: setRequiredAuditType },
                },
                query,
              ],
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: Number(limitOffset) },
          { $limit: Number(initialLimit) },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              emailAddress: 1,
              status: 1,
              auditType: 1,
              gitHub: 1,
              offerAmount: 1,
              amt: 1,
              pId: 1,
              postID: 1,
              estimatedDelivery: 1,
              description: 1,
              socialLink: 1,
              auditorEmail: 1,
              currentAuditId: 1,
              submit: 1,
              extensionRequest: 1,
              profilePicture: "$users.profilePicture",
              new: 1,
              createdAt: 1,
              userType: {
                $cond: {
                  if: {
                    $eq: ["$emailAddress", req.user.email.toLowerCase()],
                  },
                  then: "patron",
                  else: "auditor",
                },
              },
            },
          },
        ]);
        responseCount = await postsModel.aggregate([
          {
            $addFields: {
              amt: { $toString: "$offerAmount" },
              pId: { $toString: "$postID" },
              EmailAddress: req.user.email.toLowerCase(),
            },
          },
          {
            $match: {
              $and: [
                {
                  $or: [
                    { emailAddress: req.user.email.toLowerCase() },
                    {
                    $and: [
                      { auditorEmail: req.user.email.toLowerCase() },
                      { status : {$ne: "PENDING"} },
                    ]
                  }
                  ],
                  status: { $ne: "PRE_REGISTERATION" },
                  $expr: {
                    $and: [
                      { $gt: ["$offerAmount", Number(setOfferAmountLower)] }, // Greater than 10
                      { $lt: ["$offerAmount", Number(setOfferAmountHigher)] }, // Less than 20
                    ],
                  },
                  auditType: { $in: setRequiredAuditType },
                },
                query,
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              emailAddress: 1,
              status: 1,
              auditType: 1,
              gitHub: 1,
              offerAmount: 1,
              amt: 1,
              pId: 1,
              postID: 1,
              estimatedDelivery: 1,
              description: 1,
              socialLink: 1,
              auditorEmail: 1,
              currentAuditId: 1,
              submit: 1,
              extensionRequest: 1,
              profilePicture: "$users.profilePicture",
              new: 1,
              createdAt: 1,
              userType: {
                $cond: {
                  if: {
                    $eq: ["$emailAddress", req.user.email.toLowerCase()],
                  },
                  then: "patron",
                  else: "auditor",
                },
              },
            },
          },
        ]);
      } else {
        response = await postsModel.aggregate([
          {
            $match: {
              $or: [
                { emailAddress: req.user.email.toLowerCase() },
                {
                  $and: [
                    { auditorEmail: req.user.email.toLowerCase() },
                    { status : {$ne: "PENDING"} },
                  ]
                },
              ],
              status: { $ne: "PRE_REGISTERATION" },
              $expr: {
                $and: [
                  { $gt: ["$offerAmount", Number(setOfferAmountLower)] }, // Greater than 10
                  { $lt: ["$offerAmount", Number(setOfferAmountHigher)] }, // Less than 20
                ],
              },
              auditType: { $in: setRequiredAuditType },
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: Number(limitOffset) },
          { $limit: Number(initialLimit) },
          {
            $addFields: {
              EmailAddress: req.user.email.toLowerCase(),
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              emailAddress: 1,
              status: 1,
              auditType: 1,
              gitHub: 1,
              offerAmount: 1,
              postID: 1,
              estimatedDelivery: 1,
              description: 1,
              socialLink: 1,
              auditorEmail: 1,
              currentAuditId: 1,
              submit: 1,
              extensionRequest: 1,
              profilePicture: "$users.profilePicture",
              new: 1,
              createdAt: 1,
              userType: {
                $cond: {
                  if: {
                    $eq: ["$emailAddress", req.user.email.toLowerCase()],
                  },
                  then: "patron",
                  else: "auditor",
                },
              },
            },
          },
        ]);
        responseCount = await postsModel.aggregate([
          {
            $match: {
              $or: [
                { emailAddress: req.user.email.toLowerCase() },
                {
                  $and: [
                    { auditorEmail: req.user.email.toLowerCase() },
                    { status : {$ne: "PENDING"} },
                  ]
                },
              ],
              status: { $ne: "PRE_REGISTERATION" },
              $expr: {
                $and: [
                  { $gt: ["$offerAmount", Number(setOfferAmountLower)] }, // Greater than 10
                  { $lt: ["$offerAmount", Number(setOfferAmountHigher)] }, // Less than 20
                ],
              },
              auditType: { $in: setRequiredAuditType },
            },
          },
          {
            $addFields: {
              EmailAddress: req.user.email.toLowerCase(),
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              emailAddress: 1,
              status: 1,
              auditType: 1,
              gitHub: 1,
              offerAmount: 1,
              postID: 1,
              estimatedDelivery: 1,
              description: 1,
              socialLink: 1,
              auditorEmail: 1,
              currentAuditId: 1,
              submit: 1,
              extensionRequest: 1,
              profilePicture: "$users.profilePicture",
              new: 1,
              createdAt: 1,
              userType: {
                $cond: {
                  if: {
                    $eq: ["$emailAddress", req.user.email.toLowerCase()],
                  },
                  then: "patron",
                  else: "auditor",
                },
              },
            },
          },
        ]);
      }
      let final;
      if (sort) {
        if (reverse == false) {
          final = Sort.sortBy(response, sort);
        } else {
          final = Sort.sortBy(response, sort).reverse();
        }
      } else {
        final = response;
      }
      MessageUtil.success(res, {
        message: RES_MSG.SUCCESS,
        status: RESPONSES.SUCCESS,
        error: false,
        pages: Math.ceil(responseCount.length / initialLimit),
        count: responseCount.length,
        docCount: final.length,
        data: final,
      });
    } catch (error: any) {
      MessageUtil.error(res, {
        message: RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async getDetailsOfAudit(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .lowercase()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required(),
      });
      const { error } = schema.validate(req.body);
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      const detailsOfPost: any = await postsModel.findOne({
        postID: req.body.postID,
      });
      let response: any;
      if (detailsOfPost.auditorEmail == "") {
        response = await postsModel.aggregate([
          {
            $match: {
              postID: req.body.postID,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $project: {
              _id: 0,
              emailAddress: 1,
              estimatedDelivery: 1,
              description: 1,
              postID: 1,
              status: 1,
              offerAmount: 1,
              gitHub: 1,
              auditorEmail: 1,
              auditType: 1,
              socialLink: 1,
              currentAuditId: 1,
              extensionRequest: 1,
              submit: 1,
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              profilePicture: "$users.profilePicture",
              bio: "$users.bio",
              linkedIn: "$users.linkedIn",
              telegram: "$users.telegram",
              userGithub: "$users.gitHub",
              // new: 1,
              createdAt: 1,
            },
          },
        ]);
      } else {
        response = await postsModel.aggregate([
          {
            $match: {
              postID: req.body.postID,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "emailAddress",
              foreignField: "emailAddress",
              as: "users",
            },
          },
          { $unwind: "$users" },
          {
            $lookup: {
              from: "jobs",
              localField: "postID",
              foreignField: "postID",
              as: "jobs",
            },
          },
          {
            $addFields: {
              chosenDocument: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$jobs',
                      as: 'doc',
                      cond: {
                        $eq: ['$$doc.status', 'CONFIRM'] // Modify the condition as needed
                      },
                    },
                  },
                  0, // Choose the first document that matches the condition
                ],
              },
            },
          },
          {
            $project: {
              _id: 0,
              emailAddress: 1,
              estimatedDelivery: 1,
              description: 1,
              postID: 1,
              status: 1,
              offerAmount: 1,
              gitHub: 1,
              auditorEmail: "$chosenDocument.emailAddress",
              auditType: 1,
              socialLink: 1,
              currentAuditId: 1,
              extensionRequest: 1,
              history: "$chosenDocument.history",
              firstName: "$users.firstName",
              lastName: "$users.lastName",
              profilePicture: "$users.profilePicture",
              bio: "$users.bio",
              linkedIn: "$users.linkedIn",
              telegram: "$users.telegram",
              userGithub: "$users.gitHub",
              createdAt: 1,
            },
          },
        ]);
      }
      const data = response[0];
      let statusData: any = await postsModel.findOneAndUpdate({
        postID: req.body.postID,
        status: "PENDING",
      },
      {
        $set: {
          new: false
        }
      },
      {
        returnOriginal: false
      });

      MessageUtil.success(res, {
        message: RES_MSG.SUCCESS,
        status: RESPONSES.SUCCESS,
        error: false,
        data: data,statusData,
      });
    } catch (error: any) {
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async getArbitorSpecificPost(req: any, res: any) {
    let initialPage = req.query.page ? req.query.page : 1;
    let initialLimit = req.query.limit ? req.query.limit : 10;
    let limitOffset: any = (Number(initialPage) - 1) * Number(initialLimit);

    const arb: any[] = [
      config.Arbiters.Arbiter1?.toString(),
      config.Arbiters.Arbiter2?.toString(),
      config.Arbiters.Arbiter3?.toString(),
      config.Arbiters.Arbiter4?.toString(),
      config.Arbiters.Arbiter5?.toString(),
    ];

    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .lowercase()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        page: Joi.number(),
        limit: Joi.number(),
      });

      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      }

      const userData: any = await userModel.findOne({
        emailAddress: req.user.email.toLowerCase(),
      });
      if (userData) {
        const isWalletUpdated: any = userData.walletAddress;
        for (let i = 0; i < arb.length; i++) {
          if (arb[i] == isWalletUpdated) {
            let count = await postsModel.countDocuments({
              status: "UNDER_ARBITERATION",
            });
            let auditorPosts = await postsModel.aggregate([
              {
                $match: {
                  status: "UNDER_ARBITERATION",
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "emailAddress",
                  foreignField: "emailAddress",
                  as: "users",
                },
              },
              {
                $unwind: "$users",
              },
              {
                $project: {
                  postID: 1,
                  firstName: "$users.firstName",
                  lastName: "$users.lastName",
                  gitHub: 1,
                  auditType: 1,
                  emailAddress: 1,
                  arbitersList: 1,
                  voteCount: 1,
                  reason:1,
                  voteID: 1,
                  timeOfArb: 1,
                  currentAuditId:1
                },
              },
              {
                $sort: {
                  timeOfArb: -1
                }
              },
              { $skip: Number(limitOffset) },
              { $limit: Number(initialLimit) },
            ]);
            if (auditorPosts.length > 0) {
              MessageUtil.success(res, {
                message: RES_MSG.SUCCESS,
                status: RESPONSES.SUCCESS,
                error: false,
                limit: auditorPosts.length,
                page: Number(initialPage),
                totalPage: Math.ceil(count / initialLimit),
                data: auditorPosts,
              });
            } else {
              MessageUtil.success(res, {
                message: RES_MSG.NO_DATA,
                status: RESPONSES.NOCONTENT,
                error: true,
              });
            }
            break;
          }
        }
      }
    } catch (error: any) {
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }
}
export default new postAudit();
