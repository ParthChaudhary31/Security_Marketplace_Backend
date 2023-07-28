import { Request, Response } from "express";
import postsModel from "../../models/posts.model";
import bcrypt from "bcrypt";
import Joi from "joi";
import sendEmail from "../../helpers/mailHelper";
import { MessageUtil } from "../../utils/message";
import { RESPONSES, RES_MSG } from "../../constant/response";
import userModel from "../../models/user.model";
class postAudit {
    // This function handles the registration of an audit.
    public async registerAudit(req: Request, res: Response) {
        try {
            // Define a Joi schema to validate the request data.
            const schema = Joi.object({
                auditType: Joi.array().items(Joi.string().trim()).required().error(new Error("Invalid Audit Type")),
                gitHub: Joi.string().trim().required().pattern(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:tree|blob|releases)\/[A-Za-z0-9_.-\/-]+$/).error(new Error("Invalid GitHub link")),
                offerAmount: Joi.number().required().min(1).error(new Error("Invalid Offer Amount")),
                estimatedDelivery: Joi.string().trim().required().pattern(/^(0[1-9]|[1-2]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/).error(new Error("Invalid Date Format")),//DD/MM/YYYY
                description: Joi.string().trim().required(),
                socialLink: Joi.string().trim().required(),
                emailAddress: Joi.string().required().email().error(new Error("EmailAddress validation failed"))
            })
            const { error } = schema.validate(req.body)
            // If validation fails, throw an error with the corresponding message.
            if (error)
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: error.message,
                };
            // Check if the user exists in the database based on the provided email address.
            const userData = await userModel.findOne({ emailAddress: req.body.emailAddress })
            if (userData) {
                // If the user exists, create a new audit post using the provided data.
                await postsModel.create(
                    {
                        emailAddress: req.body.emailAddress.toLowerCase(),
                        status: "PENDING",
                        auditType: req.body.auditType,
                        gitHub: req.body.gitHub,
                        offerAmount: Number(String(req.body.offerAmount).trim()),
                        postID: Math.trunc(Math.random() * 100000),
                        estimatedDelivery: req.body.estimatedDelivery,
                        description: req.body.description,
                        socialLink: req.body.socialLink
                    }).then((response) => {
                        // Return a success response with the created audit post and user's first name and last name.
                        MessageUtil.success(res,
                            {
                                message: RES_MSG.SUCCESS,
                                status: RESPONSES.SUCCESS,
                                error: false,
                                data: {
                                    response,
                                    firstName: userData.firstName,
                                    lastName: userData.lastName
                                }
                            })
                    }).catch((err) => {
                        // If there is an error during the database create operation, return an error response with the appropriate message.
                        MessageUtil.error(res,
                            {
                                message: err?.message || RES_MSG.BADREQUEST,
                                status: RESPONSES.BADREQUEST,
                                error: true
                            })
                    })
            }
            else {
                // If the user does not exist, return an error response.
                return MessageUtil.error(res, {
                    message: RES_MSG.BADREQUEST,
                    status: RESPONSES.BADREQUEST,
                    error: true
                })
            }
        }
        catch (error: any) {
            // Catch any errors that occurred during the registration process and return an error response.
            MessageUtil.error(res,
                {
                    message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
                    status: RESPONSES.INTERNALSERVER,
                    error: true
                })
        }
    }

    // This function updates the auditor's email address for a specific audit post.
    public async updateAuditorID(req: Request, res: Response) {
        try {
            const emailAddress = req.body.emailAddress.toLowerCase();
            // Define a Joi schema to validate the request data.
            const schema = Joi.object({
                emailAddress: Joi.string().required().email(),
                postID: Joi.number().required(),
                auditorEmail: Joi.string().required().email()
            })
            const { error } = schema.validate(req.body)
            // If validation fails, throw an error with the corresponding message.
            if (error)
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: error.message,
                };
            const query = await postsModel.findOne({ postID: req.body.postID, status: { $in: ["PENDING"] }, emailAddress: emailAddress });
            if (query) {
            // Find the auditor by their email address in the database.
            const auditor: any = await userModel.find({ emailAddress: req.body.auditorEmail });
            // If the auditor is not found in the database, throw an error indicating that the auditor was not found.
            if (auditor.length == 0) {
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: RES_MSG.AUDITOR_NOT_FOUND,
                };
            }
            // Update the audit post with the new auditor's email address.
            let response = await postsModel.updateOne({ postID: req.body.postID },
                {
                    $set: {
                        auditorEmail: req.body.auditorEmail.toLowerCase()
                    }
                },
                {
                    returnOriginal: false,
                }
            )
                // Return a success response with the updated audit post data.
                MessageUtil.success(res,
                    {
                        message: RES_MSG.SUCCESS,
                        status: RESPONSES.SUCCESS,
                        error: false,
                        data: response
                    })
                }
                else{
                    // If there is an error during the database update, return an error response with the appropriate message.
                    MessageUtil.error(res,
                        {
                            message: RES_MSG.POST_ID_MISMATCHED,
                            status: RESPONSES.BADREQUEST,
                            error: true
                        })
                // })

            }
        }
        catch (error: any) {
            // Catch any errors that occurred during the update process and return an error response.
            MessageUtil.error(res,
                {
                    message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
                    status: RESPONSES.INTERNALSERVER,
                    error: true
                })
        }
    }


    public async updateAuditStatus(req: Request, res: Response) {
        try {
            const emailAddress = req.body.emailAddress.toLowerCase();
            // Define a Joi schema to validate the request data.
            const schema = Joi.object({
                emailAddress: Joi.string().required().email(),
                postID: Joi.number().required(),
                status: Joi.string().trim().required()
            })
            const { error } = schema.validate(req.body)
            // If validation fails, throw an error with the corresponding message.
            if (error)
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: error.message,
                };
            const query = await postsModel.findOne({ postID: req.body.postID, status: { $in: ["PENDING", "IN_PROGRESS"] }, emailAddress: emailAddress });
            if (query) {
                // Update the audit post with the provided status if the post exists and its current status is either "PENDING" or "IN_PROGRESS".
                const response = await postsModel.updateOne({ postID: req.body.postID, status: { $in: ["PENDING", "IN_PROGRESS"] }, emailAddress: emailAddress },
                    {
                        $set: req.body
                    },
                    {
                        returnOriginal: false,
                    });
                // Return a success response with the updated audit post data.
                MessageUtil.success(res,
                    {
                        message: RES_MSG.SUCCESS,
                        status: RESPONSES.SUCCESS,
                        error: false,
                        data: response
                    })
            }
            else {
                // If there is an error during the database update, return an error response with the appropriate message.
                MessageUtil.error(res,
                    {
                        message: RES_MSG.POST_ID_MISMATCHED,
                        status: RESPONSES.BADREQUEST,
                        error: true
                    })
            }

        }
        catch (error: any) {
            // Catch any errors that occurred during the update process and return an error response.
            MessageUtil.error(res,
                {
                    message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
                    status: RESPONSES.INTERNALSERVER,
                    error: true
                })
        }
    }

    public async getDetailsOfAllAuditsPublic(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                emailAddress: Joi.string().lowercase().required().email()
            })
            const { error } = schema.validate(req.body)
            if (error)
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: error.message,
                };
            const { page, limit, search }: any = req.query;
            let initialPage = page ? page : 1;
            let initialLimit = limit ? limit : 10;
            let limitOffset: any = (Number(initialPage) - 1) * Number(initialLimit);
            let response: any = [];
            const s: Number = Number(search);
            if (search && search.trim()) {
                response = await postsModel.find({
                    $or: [
                        { auditType: { $regex: search } },
                        // { offerAmount: { $regex: s} },
                        { emailAddress: { $regex: search } },
                        { auditorEmail: { $regex: search } },
                        { estimatedDelivery: { $regex: search } },
                        // { postID: { $regex: 46703} }
                    ]
                }).skip(limitOffset).limit(initialLimit)
            }
            else {
                response = await postsModel.find().skip(limitOffset).limit(initialLimit)
            }
            const data = await response.map(async (e: any) => {
                const userData: any = await userModel.find({ emailAddress: e?.emailAddress })
                return {
                    emailAddress: e?.emailAddress,
                    _id: e?._id,
                    firstName: userData[0].firstName,
                    lastName: userData[0].lastName,
                    createdAt: e?.createdAt,
                    auditType: e?.auditType,
                    gitHub: e?.gitHub,
                    postID: e?.postID,
                    offerAmount: e?.offerAmount,
                    estimatedDelivery: e?.estimatedDelivery
                }
            })

            const final = await Promise.all(data);
            MessageUtil.success(res,
                {
                    message: RES_MSG.SUCCESS,
                    status: RESPONSES.SUCCESS,
                    error: false,
                    count: search && search.trim() ? final.length : response.length,
                    data: final

                })
        }
        catch (error: any) {
            MessageUtil.error(res,
                {
                    message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
                    status: RESPONSES.INTERNALSERVER,
                    error: true
                })
        }
    }


    public async getDetailsOfAllAudits(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                emailAddress: Joi.string().lowercase().required().email()
            })
            const { error } = schema.validate(req.body)
            if (error)
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: error.message,
                };

            const { page, limit, search }: any = req.query;
            let initialPage = page ? page : 1;
            let initialLimit = limit ? limit : 10;
            let limitOffset: any = (Number(initialPage) - 1) * Number(initialLimit);
            let response: any = [];
            const s: Number = Number(search);
            if (search && search.trim()) {
                response = await postsModel.find({ emailAddress: req.body.emailAddress.toLowerCase() },
                    {
                        $or: [
                            { auditType: { $regex: search } },
                            // { offerAmount: { $regex: s} },
                            { emailAddress: { $regex: search } },
                            { auditorEmail: { $regex: search } },
                            { estimatedDelivery: { $regex: search } },
                            // { postID: { $regex: 46703} }
                        ]
                    }).skip(limitOffset).limit(initialLimit)
            }
            else {
                response = await postsModel.find({ emailAddress: req.body.emailAddress.toLowerCase() }).skip(limitOffset).limit(initialLimit)
            }

            const data = await response.map(async (e: any) => {
                const userData: any = await userModel.find({ emailAddress: e?.emailAddress })
                return {
                    emailAddress: e?.emailAddress,
                    _id: e?._id,
                    firstName: userData[0].firstName,
                    lastName: userData[0].lastName,
                    createdAt: e?.createdAt,
                    auditType: e?.auditType,
                    gitHub: e?.gitHub,
                    postID: e?.postID,
                    offerAmount: e?.offerAmount,
                    estimatedDelivery: e?.estimatedDelivery
                }
            })

            const final = await Promise.all(data);
            MessageUtil.success(res,
                {
                    message: RES_MSG.SUCCESS,
                    status: RESPONSES.SUCCESS,
                    error: false,
                    count: search && search.trim() ? final.length : response.length,
                    data: final
                })
        }
        catch (error: any) {
            MessageUtil.error(res,
                {
                    message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
                    status: RESPONSES.INTERNALSERVER,
                    error: true
                })
        }
    }
    public async getDetailsOfAudit(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                emailAddress: Joi.string().lowercase().required().email(),
                postID: Joi.number().required()
            })
            const { error } = schema.validate(req.body)
            if (error)
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: error.message,
                };
            const response = await postsModel.findOne({ postID: req.body.postID })
            if(!response){
                throw { 
                    message: RES_MSG.POST_NOT_FOUND,
                    status: RESPONSES.BADREQUEST,
                    error: true
                }
            }

                const userData: any = await userModel.find({ emailAddress: response?.emailAddress })
                MessageUtil.success(res,
                    {
                        message: RES_MSG.SUCCESS,
                        status: RESPONSES.SUCCESS,
                        error: false,
                        data: {
                            response,
                            firstName: userData[0].firstName,
                            lastName: userData[0].lastName,
                        }
                    })
        }
        catch (error: any) {
            MessageUtil.error(res,
                {
                    message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
                    status: RESPONSES.INTERNALSERVER,
                    error: true
                })
        }
    }
}
export default new postAudit();
