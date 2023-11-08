import { Request, Response } from "express";
import { MessageUtil } from "../../utils/message";
import { RESPONSES, RES_MSG } from "../../constant/response";
import Joi from "joi";
import config from "../../config/configLocal";
import postsModel from "../../models/posts.model";
import userModel from "../../models/user.model";
import arbiterationModel from "../../models/arbiteration.model";
import { Keyring } from "@polkadot/api";
import { WsProvider } from "@polkadot/rpc-provider";
import { ApiPromise } from "@polkadot/api";
import { Abi, ContractPromise } from "@polkadot/api-contract";
import VoteAbi from "../../utils/abi/voteABI.json";
import polkadotFunctionHelper from "../../helpers/polkadotFunctionHelper";
class Selection {
  constructor() {
    // Bind the selectArbitors method to the current instance of Selection
    this.selectArbitors = this.selectArbitors.bind(this);
  }
  async vote(auditID: any, bufferForAdmin: any) {
    try {
      const keyring = new Keyring({ type: "sr25519" });
      const privateKey: any =config.SECRET_KEY
      const senderPair = keyring.addFromUri(privateKey);
      const webSocketUrl: any = config.WEB_SOCKET;
      const wsProvider: any = new WsProvider(webSocketUrl.toString());
      const api: any = await ApiPromise.create({ provider: wsProvider });
      const abi: any = new Abi(VoteAbi, api.registry.getChainProperties());
      const voting: any = config.VOTING_ADDRESS;
      const contract: any = new ContractPromise(api, abi, voting.toString());
      const gasLimit = api.registry.createType(
        "WeightV2",
        await api.consts.system.blockWeights["maxBlock"]
      );
      const { gasRequired } = await contract?.query?.createNewPoll(
        senderPair.address,
        {
          gasLimit: gasLimit,
        },
        auditID,
        bufferForAdmin,
        [
          {
            voterAddress: config.Arbiters.Arbiter1?.toString(),
            hasVoted: false,
          },
          {
            voterAddress: config.Arbiters.Arbiter2?.toString(),
            hasVoted: false,
          },
          {
            voterAddress: config.Arbiters.Arbiter3?.toString(),
            hasVoted: false,
          },
          {
            voterAddress: config.Arbiters.Arbiter4?.toString(),
            hasVoted: false,
          },
          {
            voterAddress: config.Arbiters.Arbiter5?.toString(),
            hasVoted: false,
          },
        ]
      );
      let voteID : any
      const eventResults: any = await new Promise(async (resolve) => {
        contract?.tx
          ?.createNewPoll({ gasLimit: gasRequired }, auditID, bufferForAdmin, [
            {
              voterAddress: config.Arbiters.Arbiter1?.toString(),
              hasVoted: false,
            },
            {
              voterAddress: config.Arbiters.Arbiter2?.toString(),
              hasVoted: false,
            },
            {
              voterAddress: config.Arbiters.Arbiter3?.toString(),
              hasVoted: false,
            },
            {
              voterAddress: config.Arbiters.Arbiter4?.toString(),
              hasVoted: false,
            },
            {
              voterAddress: config.Arbiters.Arbiter5?.toString(),
              hasVoted: false,
            },
          ])
          .signAndSend(
            senderPair,
            async ({ events = [], status }: { events: any; status: any }) => {
              if (status.isInBlock) {
                for (const { event, phase } of events) {
                  if (api.events.contracts.ContractEmitted.is(event)) {
                    const [account_id, contract_evt] = event.data;
                    const res: any = await this.getDecodedEvent(contract_evt);
                    voteID = res[0].toHuman() 
                    resolve(res[1].toHuman());
                  }
                }
              } else if (status.isFinalized) {
                console.log("Finalized block hash", status.asFinalized.toHex());
                resolve([]); // Resolve with an empty array if no events found
              }
            }
          );
      });
      
      return {voteID,eventResults};
    } catch (error) {
      console.error("An error occurred during the contract call:", error);
      throw new Error("An error occurred while processing the transaction");
    }
  }

  getDecodedEvent(event: any) {
    try {
      const decoded = new Abi(VoteAbi).decodeEvent(event);
      return decoded.args;
    } catch (err) {
      console.log("");
    }
  }

  public async selectArbitors(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .email()
          .required()
          .error(new Error("Please enter a valid email")),
        postID: Joi.number().required().error(new Error("Invalid POST ID")),
        reason: Joi.string().required().error(new Error("Reason must be Provided"))
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      }
      const postData: any = await postsModel.findOne({
        emailAddress: req.user.email,
        postID: req.body.postID,
        status: "SUBMITTED",
      });
      if(postData.status == "SUBMITTED"){
        let paymentInfo = await polkadotFunctionHelper.getPaymentInfo(postData.currentAuditId);
        if(paymentInfo.status != "AuditAwaitingValidation"){
          return MessageUtil.error(res,{
            message:RES_MSG.VALIDATION_FAILED_FROM_SMART_CONTRACT,
            error: true,
            status: RESPONSES.BADREQUEST
          })
        }
      }
      const post: any = await arbiterationModel.findOne({
        postID: req.body.postID,
      });
      if (post) {
        return MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          message: RES_MSG.NO_DATA,
        });
      } else {
        let txResult = await this.vote(postData.currentAuditId, 164000000);
        let currentTime = Date.now();
        let nextDay = Date.now() + 86400000; //24 hours 
        let tempPost: any = await postsModel.findOne({
          postID: req.body.postID,
        });
        const obj: any = {
          postID: req.body.postID,
          arbitersList: [
            {
              arbiter: txResult.eventResults.arbiters[0].voterAddress,
              vote: txResult.eventResults.arbiters[0].hasVoted,
            },
            {
              arbiter: txResult.eventResults.arbiters[1].voterAddress,
              vote: txResult.eventResults.arbiters[1].hasVoted,
            },
            {
              arbiter: txResult.eventResults.arbiters[2].voterAddress,
              vote: txResult.eventResults.arbiters[2].hasVoted,
            },
            {
              arbiter: txResult.eventResults.arbiters[3].voterAddress,
              vote: txResult.eventResults.arbiters[3].hasVoted,
            },
            {
              arbiter: txResult.eventResults.arbiters[4].voterAddress,
              vote: txResult.eventResults.arbiters[4].hasVoted,
            },
          ],
          timeAtUnderArbiteration:currentTime,
          forceVoteDeadline: nextDay,
          currentAuditId:tempPost.currentAuditId,
          isForceVoted:false,
          voteID: txResult.voteID
        };
        let arbModel = await arbiterationModel.create(obj);
        if (arbModel) {
          let response = await postsModel.findOneAndUpdate(
            {
              emailAddress: req.user.email,
              postID: req.body.postID,
              status: "SUBMITTED",
            },
            {
              $set: {
                status: "UNDER_ARBITERATION",
                reason:req.body.reason,
                timeOfArb: currentTime,
                voteID: txResult.voteID,
                arbitersList: [
                  {
                    arbiter: config.Arbiters.Arbiter1?.toString(),
                  },
                  {
                    arbiter: config.Arbiters.Arbiter2?.toString(),
                  },
                  {
                    arbiter: config.Arbiters.Arbiter3?.toString(),
                  },
                  {
                    arbiter: config.Arbiters.Arbiter4?.toString(),
                  },
                  {
                    arbiter: config.Arbiters.Arbiter5?.toString(),
                  },
                ],
              },
            },
            {
              returnOriginal: false,
            }
          );
          if (response == null) {
            return MessageUtil.success(res, {
              status: RESPONSES.SUCCESS,
              error: false,
              message: RES_MSG.NO_DATA,
            });
          }
          return MessageUtil.success(res, {
            message: RES_MSG.SUBMIT_DECLINED,
            status: RESPONSES.SUCCESS,
            error: false,
            data: response,
          });
        }
      }
    } catch (error) {
      return MessageUtil.error(res, {
        message: error || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async viewArbiterationDetails(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .email()
          .required()
          .error(new Error("Please enter a valid email")),
        patron: Joi.string()
          .required()
          .error(new Error("Invalid patron Email")),
        postID: Joi.number().required().error(new Error("Invalid POST ID")),
      });

      const { error } = schema.validate(req.body);
      if (error) {
        return MessageUtil.success(res, {
          status: RESPONSES.BADREQUEST,
          error: false,
          message: error?.message,
        });
      }

      let response = await postsModel.aggregate([
        {
          $addFields: {
            pId: { $toString: "$postID" },
          },
        },
        {
          $match: {
            $and: [
              {
                $and: [
                  { emailAddress: req.body.patron.toLowerCase() },
                  { postID: req.body.postID },
                ],
                status: "UNDER_ARBITERATION",
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
          $lookup: {
            from: "jobs",
            localField: "postID",
            foreignField: "postID",
            as: "jobs",
          },
        },
        { $unwind: "$jobs" },
        {
          $project: {
            _id: 0,
            firstName: "$users.firstName",
            lastName: "$users.lastName",
            emailAddress: 1,
            status: 1,
            auditType: 1,
            gitHub: 1,
            offerAmount: "$jobs.estimatedAmount",
            postID: 1,
            estimatedDelivery: "$jobs.estimatedDelivery",
            description: 1,
            socialLink: 1,
            auditorEmail: 1,
            submit: 1,
            reason: 1,
            profilePicture: "$users.profilePicture",
            createdAt: 1,
          },
        },
      ]);
      if (response != null) {
        return MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          data: response,
        });
      } else {
        return MessageUtil.success(res, {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: RES_MSG.BADREQUEST,
        });
      }
    } catch (error) {
      return MessageUtil.success(res, {
        status: RESPONSES.INTERNALSERVER,
        error: false,
        message: RES_MSG.INTERNAL_SERVER_ERROR,
      });
    }
  }

  public async voteForPost(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        emailAddress: Joi.string()
          .email()
          .required()
          .error(new Error("Please enter a valid email")),
        postID: Joi.number().required().error(new Error("Invalid POST ID")),
        voteType: Joi.number()
          .required()
          .error(new Error("Please enter a valid voteType")),
        vote: Joi.boolean().required().error(new Error("Vote is mandatory")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      }
      let user: any = await userModel.findOne({
        emailAddress: req.user.email.toLowerCase(),
      });
      if (user?.walletAddress == undefined || "" || null) {
        return MessageUtil.success(res, {
          status: RESPONSES.UN_AUTHORIZED,
          error: true,
          message: RES_MSG.NOT_ARBITER,
        });
      }

      let voteEligibility: any = await arbiterationModel.findOne({
        postID: req.body.postID,
        isForceVoted: false
      });
      if (Date.now() > voteEligibility?.forceVoteDeadline  && (Date.now() - 60000) < voteEligibility?.forceVoteDeadline) {
        return MessageUtil.success(res, {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: RES_MSG.VOTE_TIME_CROSSED,
        });
      }

      let post: any = await postsModel.findOne({ postID: req.body.postID, status: "UNDER_ARBITERATION" });
      if (post) {
          let hiercut = await polkadotFunctionHelper.getPollInfo(post.voteID)
          let paymentInfo = await polkadotFunctionHelper.getPaymentInfo(post?.currentAuditId);
          if(paymentInfo.status != "AuditAwaitingValidation" ){
            if(paymentInfo.status == "AuditExpired" || paymentInfo?.status == "AuditCompleted" || post.voteCount == 4){
              let arbObj = post.arbitersList;
              let newOfferAmountStringified = await polkadotFunctionHelper.removeCommas(String(paymentInfo.newOfferAmount))
              await arbObj.map(async (e: any) => {
                if (e.arbiter == user.walletAddress) {
                  let response: any
                  if(paymentInfo?.status == "AuditExpired" || paymentInfo?.status == "AuditCompleted" ){
                  response = await postsModel.findOneAndUpdate(
                    { 
                      postID: req.body.postID
                    },
                    {
                      $set: {
                        status: paymentInfo?.status == "AuditExpired"? "FAILED" : "COMPLETED"
                      }
                    },
                    {
                      returnOriginal: false
                    }
                    ); 
                    await polkadotFunctionHelper.distribute(String(post.voteID), String(((Number(await polkadotFunctionHelper.to18DecimalPrecision(post.offerAmount)) - newOfferAmountStringified) * 95) / 100))
                    return MessageUtil.success(res,{
                      message: RES_MSG.SUCCESS,
                      status: RESPONSES.SUCCESS,
                      error: false,
                      data: response
                    })
                  }
                  else{
                      response = await postsModel.findOneAndUpdate(
                      { 
                        postID: req.body.postID 
                      },
                      {
                        $set: {
                          status: "IN_PROGRESS",
                          offerAmount: await polkadotFunctionHelper.from18DecimalPrecision(newOfferAmountStringified),
                          estimatedDelivery: await polkadotFunctionHelper.removeCommas(String(paymentInfo.newDeadline))
                        }
                      },
                      {
                        returnOriginal: false
                      }
                      ); 
                      let _as = await polkadotFunctionHelper.getArbitersShare()
                      let formula = (Number((await polkadotFunctionHelper.to18DecimalPrecision((post.offerAmount))))-newOfferAmountStringified) * (Number(_as)/(Number(_as) + Number(hiercut)))  * (95/100)
                      await polkadotFunctionHelper.distribute(String(post.voteID), String(formula))
                      return MessageUtil.success(res,{
                        message: RES_MSG.SUCCESS,
                        status: RESPONSES.SUCCESS,
                        error: false,
                        data: response
                      })
                  }
                }
              })
            }   
            else{
                return MessageUtil.error(res,{
                    message:RES_MSG.VALIDATION_FAILED_FROM_SMART_CONTRACT,
                    error: true,
                    status: RESPONSES.BADREQUEST
                  })
            }   
          }
          else{
        let arbObj = post.arbitersList;
        await arbObj.map(async (e: any) => {
          if (e.arbiter == user.walletAddress) {
            if (e.voteType == 0) {
              let postResponce: any = await postsModel.findOneAndUpdate(
                {
                  postID: req.body.postID,
                  "arbitersList.arbiter": user.walletAddress,
                },
                {
                  $set: {
                    "arbitersList.$.voteType": req.body.voteType,
                    "arbitersList.$.vote": req.body.vote,
                  },
                  $inc: { voteCount: 1 },
                },
                {
                  returnOriginal: false,
                }
              );
              let finalData = {
                emailAddress: postResponce.emailAddress,
                status: postResponce.status,
                auditType: postResponce.auditType,
                github: postResponce.github,
                offerAmount: postResponce.offerAmount,
                postID: postResponce.postID,
                estimatedDelivery: postResponce.estimatedDelivery,
                description: postResponce.description,
                socialLink: postResponce.socialLink,
                auditorEmail: postResponce.auditorEmail,
                submit: postResponce.submit,
                txHash: postResponce.txHash,
                salt: postResponce.salt,
                extensionRequest: postResponce.extensionRequest,
                arbitersList: postResponce.arbitersList,
                voteCount: postResponce.voteCount,
                myVote: req.body.vote,
                voteType: req.body.voteType,
              };

              return MessageUtil.success(res, {
                status: RESPONSES.SUCCESS,
                error: false,
                message: RES_MSG.SUCCESS,
                data: finalData,
              });
            } else {
              return MessageUtil.success(res, {
                status: RESPONSES.SUCCESS,
                error: false,
                message: RES_MSG.ALREADY_VOTED,
              });
            }
          }
        });
    }
  }
    }

     catch (error) {
      return MessageUtil.success(res, {
        status: RESPONSES.INTERNALSERVER,
        error: false,
        message: RES_MSG.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

export default new Selection();