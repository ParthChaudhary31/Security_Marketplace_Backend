import { Request, Response } from "express";
import postsModel from "../../models/posts.model";
import { MessageUtil } from "../../utils/message";
import Joi from "joi";
import { RESPONSES, RES_MSG } from "../../constant/response";
import jobsModel from "../../models/jobs.model";
import Sort from "lodash";
import polkadotFunctionHelper from "../../helpers/polkadotFunctionHelper";
class jobAudit {
  // User can edit his bid but can not create a new bid
  public async requestForAudit(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        posterEmailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("Poster EmailAddress validation failed")),
        estimatedAmount: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid Offer Amount")),
        estimatedDelivery: Joi.string()
          .trim()
          .required()
          .pattern(/^(0[1-9]|[1-2]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/)
          .error(new Error("Invalid Date Format")), //DD/MM/YYYY,
        postID: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid POST ID")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      }
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
      if (req.body.posterEmailAddress == req.user.email) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: RES_MSG.IDENTICAL_REQUEST,
        };
      }
      let response: any = await postsModel.find({
        postID: req.body.postID,
        status: "PENDING",
      });
      if (response[0] == null) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: RES_MSG.BID_NOT_POSSIBLE,
        };
      }
      if (
        response[0].emailAddress != req.body.posterEmailAddress.toLowerCase()
      ) {
        throw {
          message: RES_MSG.POSTER_NOT_FOUND,
          error: true,
          status: RESPONSES.BADREQUEST,
        };
      }

      let jobPastData = await jobsModel.findOne({
        postID: req.body.postID,
        emailAddress: req.user.email,
        status: "PENDING",
      });

      if (
        jobPastData?.estimatedAmount == req.body.estimatedAmount &&
        jobPastData?.estimatedDelivery == timestamp.toString()
      ) {
        throw {
          message: RES_MSG.SAME_BID,
          error: true,
          status: RESPONSES.BADREQUEST, 
          
        };
      }
      let query = await jobsModel.findOneAndUpdate(
        {
          postID: req.body.postID,
          emailAddress: req.user.email,
          status: "PENDING",
        },
        {
          $set: {
            estimatedAmount: req.body.estimatedAmount,
            estimatedDelivery: timestamp,
            isRejected: false
          },
        },
        {
          returnOriginal: false,
        }
      );
      if (!query) {
        let resp = await jobsModel.create({
          emailAddress: req.user.email.toLowerCase(),
          status: "PENDING",
          estimatedAmount: req.body.estimatedAmount,
          postID: req.body.postID,
          estimatedDelivery: timestamp,
          posterEmailAddress: response[0].emailAddress,
        });
        if (resp) {
          query = resp;
        }
      } 
      let statusData: any = await postsModel.findOneAndUpdate({
        postID: req.body.postID,
        status: "PENDING",
      },
      {
        $set: {
          new: true
        }
      },
      {
        returnOriginal: false
      });
      MessageUtil.success(res, {
        message: RES_MSG.BID_SUCCESS,
        status: RESPONSES.SUCCESS,
        error: false,
        data: query,statusData,
      });
    } catch (error: any) {
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  // make it flexible for all the bid statuses [pending, confirmed, failed]
  public async updateBidStatus(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        auditorEmail: Joi.string()
          .required()
          .email()
          .error(new Error("Auditor EmailAddress validation failed")),
        postID: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid POST ID")),
        status: Joi.string().required().error(new Error("Invalid Status")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          message: error.message,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
      let obj = {
        status: req.body.status,
        isSelected: true
      };
      let response = await jobsModel.findOneAndUpdate(
        {
          posterEmailAddress: req.user.email,
          emailAddress: req.body.auditorEmail,
          postID: req.body.postID,
          status: { $in: ["PENDING", "CONFIRM"] },
          isRejected: false
        },
        {
          $set: obj,
        },
        {
          returnOriginal: false,
        }
      );
      if (response == null) {
        throw {
          message: RES_MSG.BADREQUEST,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
      MessageUtil.success(res, {
        message: RES_MSG.BID_ACCEPTED,
        status: RESPONSES.SUCCESS,
        error: false,
        data: response
      });
    } catch (error: any) {
      MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function updates the auditor's email address for a specific audit post.
  public async submitAuditReport(req: any, res: Response) {
    try {
      const email: String = req.user.email.toString().toLowerCase();
      const postID: Number = req.body.postID;
      const schema = Joi.object({
        emailAddress: Joi.string()
          .trim()
          .email()
          .required()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required().error(new Error("Invalid POST ID")),
        submit: Joi.array().items(Joi.any().allow("")),
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
      let dataOfPatron = await postsModel.findOne(
        {
          auditorEmail:email,
          postID: req.body.postID
        }
        );  
      let filePath, data;

      if (req.files) {
        if(Array.isArray(req.files.submit) && dataOfPatron?.auditType?.length == 1){
          throw {
            status: RESPONSES.BADREQUEST,
            error: true,
            message: RES_MSG.SUBMIT_MISMATCHED,
          }
        }
        let arrayOfSubmit = dataOfPatron?.auditType?.length == 1 ? [req.files.submit] : req.files.submit;
        if((dataOfPatron?.auditType?.length != 1 && !Array.isArray(arrayOfSubmit))){
          throw {
            status: RESPONSES.BADREQUEST,
            error: true,
            message: RES_MSG.SUBMIT_MISMATCHED,
          };
        }
        if(arrayOfSubmit.length != dataOfPatron?.auditType?.length){
          throw {
            status: RESPONSES.BADREQUEST,
            error: true,
            message: RES_MSG.SUBMIT_MISMATCHED,
          };
        }
        let obj: any = [];
        for(let i: any = 0; i<arrayOfSubmit.length;i++){
        console.log("your file is here", arrayOfSubmit[i]);
        console.log("your file size is ", arrayOfSubmit[i].size);
        console.log("your file name is ", arrayOfSubmit[i].name);
        if (arrayOfSubmit[i].size <= 500 * 1024) {
          console.log("Your file size is rightly below 100 Kb");
        } else {
          console.log("Check your file size to be less than 100 kb");
        }
        const allowedMimeTypes = ["application/pdf"];
        if (allowedMimeTypes.includes(arrayOfSubmit[i].mimetype.toString())) {
          const now = Date.now();
          filePath = now + arrayOfSubmit[i].name;
          arrayOfSubmit[i].mv(
            __dirname + "/../../../public/reports/" + filePath
          );
          console.log("filePath.toString()",filePath.toString())
          obj.push(filePath.toString())
          console.log(obj);
        }
        else {
          console.log("Check your file format to be pdf");
          return MessageUtil.error(res, {
            message: "Check your file format to be pdf",
            status: RESPONSES.BADREQUEST,
            error: true,
          });
        }
      }
          data = await postsModel.findOneAndUpdate(
            {
              postID: postID,
            },
            {
              postID: req.body.postID.toString().toLowerCase(),
              submit: obj ? obj : null,
              salt: req.body.salt,
            },
            {
              returnOriginal: false,
            }
          );

          return MessageUtil.success(res, {
            message: RES_MSG.SUCCESS,
            status: RESPONSES.SUCCESS,
            error: false,
            data: data,
          });
      
      } else {
        return MessageUtil.error(res, {
          message: "no file attached",
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
    } catch (error: any) {
      // Catch any errors that occurred during the update process and return an error response.
      return MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async confirmSubmit(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .trim()
          .email()
          .required()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required(),
        // submit: Joi.any().allow(""),
        salt: Joi.number()
          .required()
          .error(new Error("A unique Salt must be provided")),
        txHash: Joi.string().required().error(new Error("No transaction Hash")),
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
        salt: req.body.salt,
        status: "IN_PROGRESS",
        auditorEmail: req.user.email,
      });
        if(query?.status == "IN_PROGRESS"){
          let paymentInfo = await polkadotFunctionHelper.getPaymentInfo(query.currentAuditId);
          if(paymentInfo.status != "AuditSubmitted"){
            return MessageUtil.error(res,{
              message:RES_MSG.VALIDATION_FAILED_FROM_SMART_CONTRACT,
              error: true,
              status: RESPONSES.BADREQUEST
            })
          }
        }
      let data = await postsModel.findOneAndUpdate(
        {
          postID: req.body.postID,
          salt: req.body.salt,
          status: "IN_PROGRESS",
          auditorEmail: req.user.email,
        },
        {
          $set: {
            postID: req.body.postID,
            salt: req.body.salt,
            txHash: req.body.txHash,
            status: "SUBMITTED",
          },
        },
        {
          returnOriginal: false,
        }
      );
      let response = await jobsModel.findOneAndUpdate(
        {
          postID: req.body.postID,
          status: { $in: ["CONFIRM"] },
          emailAddress: req.user.email,
        },
        {
          $set: req.body,
        },
        {
          returnOriginal: false,
        }
      );
      return MessageUtil.success(res, {
        message: RES_MSG.AUDIT_SUBMITTED,
        status: RESPONSES.SUCCESS,
        error: false,
        data: { data, response },
      });
    } catch (error) {
      return MessageUtil.error(res, {
        message: RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async ExtendTimeline(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required().error(new Error("Invalid POST ID")),
        isAccepted: Joi.boolean().required(),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          message: error.message,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
      if (req.body.isAccepted) {
        const updatedJob: any = await jobsModel.findOne({
          posterEmailAddress: req.user.email,
          postID: req.body.postID,
          status: "CONFIRM", // Using a single value here
        });
        const latestEntry = updatedJob.history.slice(-1)[0];
        let obj = {
          estimatedAmount: latestEntry.proposedAmount,
          estimatedDelivery: latestEntry.proposedDeliveryTime,
        };
        let response = await jobsModel.findOneAndUpdate(
          {
            posterEmailAddress: req.user.email,
            postID: req.body.postID,
            status: { $in: ["CONFIRM"] },
          },
          {
            $set: obj,
          },
          {
            returnOriginal: false,
          }
        );
        if (!response) {
          throw {
            message: RES_MSG.BADREQUEST,
            status: RESPONSES.BADREQUEST,
            error: true,
          };
        }
        const statusChange = await postsModel.findOneAndUpdate(
          {
            emailAddress: req.user.email,
            postID: req.body.postID,
            status: "IN_PROGRESS",
            extensionRequest: true,
          },
          {
            $set: {
              extensionRequest: false,
              offerAmount: latestEntry.proposedAmount,
              estimatedDelivery: latestEntry.proposedDeliveryTime,
            },
          },
          {
            new: true,
          }
        );
        if (!statusChange) {
          throw {
            message: "extensionRequest does not exists",
            status: RESPONSES.BADREQUEST,
            error: true,
          };
        }
        return MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          data: { response, statusChange },
        });
      } else {
        const statusChange = await postsModel.findOneAndUpdate(
          {
            emailAddress: req.user.email,
            postID: req.body.postID,
            status: "IN_PROGRESS",
            extensionRequest: true,
          },
          {
            $set: {
              extensionRequest: false,
            },
          },
          {
            new: true,
          }
        );
        return MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          data: statusChange,
          message: "Patron rejected the request",
        });
      }
    } catch (error: any) {
      return MessageUtil.error(res, {
        message: error.message,
        status: error.status,
        error: error.error,
      });
    }
  }

  public async getDetailsOfExtensionRequest(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required().error(new Error("Invalid POST ID")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          message: error.message,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
    } catch (error) {}
  }

  public async setExtendTimelineData(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
        postID: Joi.number().required().error(new Error("Invalid POST ID")),
        reason: Joi.string().required(),
        proposedAmount: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid Offer Amount")),
        proposedDeliveryTime: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid days")),
        isAccepted: Joi.boolean().required(),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          message: error.message,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }

      if (req.body.isAccepted) {
        const job: any = await jobsModel.findOne({
          emailAddress: req.user.email,
          postID: req.body.postID,
          status: "CONFIRM", // Using a single value here
        });

        if (!job) {
          throw {
            message: RES_MSG.BADREQUEST,
            status: RESPONSES.BADREQUEST,
            error: true,
          };
        }
        const newHistoryEntry = {
          reason: req.body.reason,
          proposedAmount: req.body.proposedAmount,
          proposedDeliveryTime: req.body.proposedDeliveryTime,
        };
        const statusChange = await postsModel.findOneAndUpdate(
          {
            auditorEmail: req.user.email,
            postID: req.body.postID,
            status: "IN_PROGRESS",
            extensionRequest: false,
          },
          {
            $set: {
              extensionRequest: true,
            },
          },
          {
            new: true,
          }
        );
        if (!statusChange) {
          throw {
            message: RES_MSG.EXTENSION_REQUEST_ALREADY_EXISTS,
            status: RESPONSES.BADREQUEST,
            error: true,
          };
        }
        const response = await jobsModel.findOneAndUpdate(
          {
            emailAddress: req.user.email,
            postID: req.body.postID,
            status: "CONFIRM",
          },
          {
            $push: { history: newHistoryEntry },
          },
          {
            new: true,
          }
        );
        if (!response) {
          throw {
            message: RES_MSG.BADREQUEST,
            status: RESPONSES.BADREQUEST,
            error: true,
          };
        }
        return MessageUtil.success(res, {
          message: RES_MSG.EXTENTION_REQUEST_SENT,
          status: RESPONSES.SUCCESS,
          error: false,
          data: response,statusChange,
        });
      } else {
        return MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          message: RES_MSG.PATRON_REJECTED,
        });
      }
    } catch (error: any) {
      return MessageUtil.error(res, {
        message: error.message,
        status: error.status,
        error: error.error,
      });
    }
  }

  public async getDetailsOfMyAllbids(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .error(new Error("EmailAddress validation failed")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          message: error.message,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
      const {
        page,
        limit,
        search,
        sort,
        reverse,
      }: any = req.query;

      let initialPage = page ? page : 1;
      let initialLimit = limit ? limit : 10;
      let limitOffset: any = (Number(initialPage) - 1) * Number(initialLimit);
      let response: any = [];
      let responseCount;
      if (search && search.trim()) {
        const query = {
          $or: [
            { status: { $regex: new RegExp(search, "i") } },
            { emailAddress: new RegExp(search, "i") },
            { posterEmailAddress: { $regex: new RegExp(search, "i") } },
            { amt: { $regex: new RegExp(search, "i") } },
            { pId: { $regex: new RegExp(search, "i") } }
          ],
        };
        response = await jobsModel.aggregate(
        [
          {
            $addFields: {
              amt: { $toString: "$estimatedAmount" },
              pId: { $toString: "$postID" },
            },
          },
          {
            $match: {
              $and: [{
                emailAddress: req.user.email
              },
              query
              ]
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: Number(limitOffset) },
          { $limit: Number(initialLimit) },
          {
            $lookup: {
              from: "posts",
              localField: "postID",
              foreignField: "postID",
              as: "posts",
            },
          },
          { $unwind: "$posts" },
          {
            $project: {
              _id: 0,
              emailAddress: 1,
              posterEmailAddress:1,
              estimatedDelivery: 1,
              postID: 1,
              status: 1,
              isRejected: 1,
              estimatedAmount: 1,
              extensionRequest: 1,
              submit: "$posts.submit",
              createdAt: 1,
            },
          },
        ]);
        responseCount = await jobsModel.aggregate(
          [
            {
              $addFields: {
                amt: { $toString: "$estimatedAmount" },
                pId: { $toString: "$postID" },
              },
            },
            {
              $match: {
                $and: [{
                  emailAddress: req.user.email
                },
                query
                ]
              },
            },
            {
              $lookup: {
                from: "posts",
                localField: "postID",
                foreignField: "postID",
                as: "posts",
              },
            },
            { $unwind: "$posts" },
            {
              $project: {
                _id: 0,
                emailAddress: 1,
                posterEmailAddress:1,
                estimatedDelivery: 1,
                postID: 1,
                status: 1,
                isRejected: 1,
                estimatedAmount: 1,
                extensionRequest: 1,
                submit: "$posts.submit",
                createdAt: 1,
              },
            },
          ]);
      if (!response) {
        throw {
          message: RES_MSG.BADREQUEST,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }

      }
      else{
        response = await jobsModel.aggregate(
          [
            {
              $addFields: {
                amt: { $toString: "$estimatedAmount" },
                pId: { $toString: "$postID" },
              },
            },
            {
              $match: {
                  emailAddress: req.user.email
              },
            },
            { $sort: { createdAt: -1 } },
            { $skip: Number(limitOffset) },
            { $limit: Number(initialLimit) },
            {
              $lookup: {
                from: "posts",
                localField: "postID",
                foreignField: "postID",
                as: "posts",
              },
            },
            { $unwind: "$posts" },
            {
              $project: {
                _id: 0,
                emailAddress: 1,
                posterEmailAddress:1,
                estimatedDelivery: 1,
                postID: 1,
                status: 1,
                isRejected: 1,
                estimatedAmount: 1,
                extensionRequest: 1,
                submit: "$posts.submit",
                createdAt: 1,
              },
            },
          ]);
          responseCount = await jobsModel.aggregate(
            [
              {
                $addFields: {
                  amt: { $toString: "$estimatedAmount" },
                  pId: { $toString: "$postID" },
                },
              },
              {
                $match: {
                    emailAddress: req.user.email
                  },
              },
              {
                $lookup: {
                  from: "posts",
                  localField: "postID",
                  foreignField: "postID",
                  as: "posts",
                },
              },
              { $unwind: "$posts" },
              {
                $project: {
                  _id: 0,
                  emailAddress: 1,
                  posterEmailAddress:1,
                  estimatedDelivery: 1,
                  postID: 1,
                  status: 1,
                  isRejected: 1,
                  estimatedAmount: 1,
                  extensionRequest: 1,
                  submit: "$posts.submit",
                  createdAt: 1,
                },
              },
            ]);
            if (!response) {
              throw {
                message: RES_MSG.BADREQUEST,
                status: RESPONSES.BADREQUEST,
                error: true,
              };
            }
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
      return MessageUtil.success(res, {
        message: RES_MSG.SUCCESS,
        status: RESPONSES.SUCCESS,
        error: false,
        pages: Math.ceil(responseCount.length / initialLimit),
        count: responseCount.length,
        docCount: final.length,
        data: final,
      });
    } catch (error) {
      return MessageUtil.success(res, {
        message: RES_MSG.BADREQUEST,
        status: RESPONSES.BADREQUEST,
        error: false,
      });
    }
  }
}
export default new jobAudit();
