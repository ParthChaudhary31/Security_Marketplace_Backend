import { Request, Response } from "express";
import { MessageUtil } from "../../utils/message";
import { RESPONSES, RES_MSG } from "../../constant/response";
import userModel from "../../models/user.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Joi from "joi";
import speakeasy from "speakeasy";
import QrCode from "qrcode";
import config from "../../config/configLocal";
import fs from "fs";
import path from "path";
import jwtSeizeModel from "../../models/jwtSeize.model";
import TransactionModel from "../../models/transaction.model";
class UserProfile {
  // This function handles the registration of a new user.
  public async registerUser(req: Request, res: Response) {
    try {
      // Validating the request data using Joi schema.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .required()
          .email()
          .max(300)
          .error(new Error("Please enter a valid email")),
        firstName: Joi.string()
          .trim()
          .required()
          .pattern(/^[a-zA-Z!@#$%^&*]+$/)
          .max(25)
          .error(new Error("Please enter a valid first name")),
        lastName: Joi.string()
          .trim()
          .allow("")
          .pattern(/^[a-zA-Z!@#$%^&*]+$/)
          .max(25)
          .error(new Error("Last Name validation failed")),
        password: Joi.string()
          .trim()
          .required()
          .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,25}$/) //^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$

          .error(new Error("Please enter a valid password")),
        confirmPassword: Joi.string()
          .trim()
          .required()
          .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,25}$/) //^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$
          .error(new Error("Please enter a valid confirmed password")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      }
      // Check if the email address is already registered in the database.
      const data = await userModel.findOne({
        emailAddress: (req.body.emailAddress).toLowerCase(),
      });
      // If yes, throw an error with the corresponding message.
      if (data) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: RES_MSG.REGISTER_DUPLICACY,
        };
      }
      // Check if the password and confirmed password match.
      if (req.body.password != req.body.confirmPassword)
        return MessageUtil.error(res, {
          message: RES_MSG.PASSWORD_MISMATCHED,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      // If the password and confirmed password match, hash the password and proceed with registration.
      const salt = await bcrypt.genSalt(Number(10));
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      const obj = {
        emailAddress: (req.body.emailAddress).toLowerCase(),
        firstName: req.body.firstName ? req.body.firstName : "",
        lastName: req.body.lastName ? req.body.lastName : "",
        password: hashedPassword,
      };
      // Create a new user document in the database.
      await userModel
        .create(obj)
        .then(async (resp: any) => {
          const token = jwt.sign(
            {
              email: req.body.emailAddress,
              _id: resp._id,
            },
            String(config.JWT_SECRET),
            {
              expiresIn: '120m',
            }
          );

          let obj1 = {
            emailAddress: (req.body.emailAddress).toLowerCase(),
            jwtToken: token,
            timeStamp: Date.now().toString(),
          };
          let response = await jwtSeizeModel.create(obj1);
          if (response) {
            // Return success response with the generated token and user data.
            return MessageUtil.success(res, {
              message: RES_MSG.REGISTER_SUCCESS,
              status: RESPONSES.SUCCESS,
              error: false,
              token: token,
              data: {
                emailAddress: resp.emailAddress,
                firstName: resp.firstName,
                lastName: resp.lastName,
              },
            });
          }
          // If there is an error during user creation, return an error response with the corresponding message.
        })
        .catch((error: any) => {
          return MessageUtil.error(res, {
            message: RES_MSG.REGISTER_DUPLICACY,
            status: RESPONSES.BADREQUEST,
            error: error,
          });
        });
    } catch (error: any) {
      // Catch any errors that occurred during the registration process and return an error response.
      return MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function handles updating the user profile.
  public async updateProfile(req: any, res: any) {
    try {
      const email: String = req.user.email.toString().toLowerCase();
      const schema = Joi.object({
        emailAddress: Joi.string()
          .trim()
          .email()
          .error(new Error("EmailAddress validation failed")),
        walletAddress: Joi.string()
          .trim()
          .length(48)
          .allow("")
          .error(new Error("WalletAddress validation failed")),
        firstName: Joi.string()
          .trim()
          .max(25)
          .pattern(/^[a-zA-Z!@#$%^&*]+$/)
          .max(25)
          .error(new Error("First Name validation failed")),
        lastName: Joi.string()
          .trim()
          .allow("")
          .max(25)
          .pattern(/^[a-zA-Z!@#$%^&*]+$/)
          .max(25)
          .error(new Error("Last Name validation failed")),
        gitHub: Joi.string()
          .trim()
          .allow("")
          .pattern(/^(https?:\/\/)?(www\.)?github\.com\/[^\s/]+$/)
          .error(new Error("Invalid GitHub link")),
        linkedIn: Joi.string()
          .trim()
          .allow("")
          .pattern(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+$/)
          .error(new Error("Invalid linkedIn link")),
        telegram: Joi.string()
          .trim()
          .allow("")
          .pattern(/^https:\/\/t\.me\/[A-Za-z0-9_]+$/)
          .error(new Error("Invalid telegram link")),
        bio: Joi.string().trim().allow(""),
        profilePicture: Joi.any().allow(""),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      let filePath, data;
      const query = {
        walletAddress: req.body.walletAddress?.toString(),
        firstName: req.body.firstName?.toString(),
        lastName: req.body.lastName?.toString(),
        gitHub: req.body.gitHub?.toString(),
        linkedIn: req.body.linkedIn?.toString(),
        telegram: req.body.telegram?.toString(),
        bio: req.body.bio?.toString(),
      };
      if (req.files) {
        console.log("your file is here", req.files.profilePicture);
        console.log("your file size is ", req.files.profilePicture.size);
        console.log("your file name is ", req.files.profilePicture.name);
        if (req.files.profilePicture.size <= 100 * 1024) {
          console.log("Your file size is rightly below 100 Kb");
        } else {
          console.log("Check your file size to be less than 100 kb");
        }
        const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg"];
        if (
          allowedMimeTypes.includes(
            req.files.profilePicture.mimetype.toString()
          )
        ) {
          const oldPic: any = await userModel.findOne({
            emailAddress: email,
          });
          if (oldPic.profilePicture) {
            fs.unlink(
              path.join(
                __dirname,
                `/../../../public/uploads/${oldPic.profilePicture}`
              ),
              (err) => {
                console.log("error", err);
              }
            );
          }
          const now = Date.now();
          filePath = now + req.files.profilePicture.name;
          req.files.profilePicture.mv(
            __dirname + "/../../../public/uploads/" + filePath
          );
          data = await userModel.findOneAndUpdate(
            {
              emailAddress: email,
            },
            {
              ...query,
              profilePicture: filePath ? filePath.toString() : null,
            },
            {
              returnOriginal: false,
            }
          );
        } else {
          console.log("Check your file format to be jpg or jpeg or png");
        }
      } else {
        console.log("no file attached");
        data = await userModel.findOneAndUpdate(
          {
            emailAddress: email,
          },
          query,
          {
            returnOriginal: false,
          }
        ).select("-password -twoFactorAuthentication");
      }
      // Return a success response with the updated user profile data.
      return MessageUtil.success(res, {
        message: RES_MSG.PROFILE_UPDATED,
        status: RESPONSES.SUCCESS,
        error: false,
        data: data,
      });
    } catch (error: any) {
      // Catch any errors that occurred during the update process and return an error response.
      console.log(error, "error");
      return MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }
  
  public async removeProfilePicture(req: Request, res: Response){
    try{
      const schema = Joi.object({
        emailAddress: Joi.string().lowercase().required().email().error(new Error(""))
      })
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };

        let response = await userModel.findOneAndUpdate(
          {
            emailAddress: req.user.email
          },
          {
            $set: {
              profilePicture : ""
            }
          },
          {
            returnOriginal: false
          })
          if(response == null){
            throw {
              status: RESPONSES.BADREQUEST,
              error: true,
              message: RES_MSG.BADREQUEST,
            }
          }
          return MessageUtil.success(res,{
            message: RES_MSG.PROFILE_UPDATED,
            status: RESPONSES.SUCCESS,
            error: false,
            data: response
          })
    }
    catch(error){
      return MessageUtil.error(res, {
        message: RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function handles user ~!@#$%^&*_-+=`.
  public async login(req: Request, res: Response) {
    try {
      // Define a Joi schema to validate the login request data.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .lowercase()
          .required()
          .email()
          .error(new Error("Please enter a valid email")),
        password: Joi.string()
          .trim()
          .required()
          .error(new Error("Please enter a valid password")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      const email = req.body.emailAddress.toLowerCase();
      // Find the user with the given email address in the database.
      const data: any = await userModel.findOne({ emailAddress: email });
      let token;
      if (data) {
        let isMatch = await bcrypt.compare(req.body.password, data.password);
        if (isMatch) {
          if(Date.now() - data.greyListedTimestamp >= (2*3600*1000)){
            token = jwt.sign(
              {
                email: email,
                _id: data._id,
              },
              String(config.JWT_SECRET),
              {
                expiresIn: "120m",
              }
              );
              let obj1 = {
                emailAddress: (req.body.emailAddress).toLowerCase(),
                jwtToken: token,
                timeStamp: Date.now().toString(),
              };
              console.log("create=======================", obj1);
              let response = await jwtSeizeModel.create(obj1);
              let validationAttempts = await userModel.findOneAndUpdate(
                {
                  emailAddress: email,
                },
                {
                  $set: 
                  { 
                    invalidAttempt: 0,
                    greyListedTimestamp: 0
                   },
                },
                {
                  returnOriginal: false,
                }
                );
          // Return a success response with the generated token and user data.
          return MessageUtil.success(res, {
            message: RES_MSG.LOGIN_SUCCESS,
            status: RESPONSES.SUCCESS,
            error: false,
            token: token,
            data: {
              emailAddress: data?.emailAddress,
              walletAddress: data?.walletAddress || "",
              firstName: data?.firstName,
              lastName: data?.lastName,
              gitHub: data?.gitHub || "",
              linkedIn: data?.linkedIn || "",
              telegram: data?.telegram || "",
              bio: data?.bio || "",
              profilePicture: data?.profilePicture || "",
              twoFactorAuthenticationStatus:
                data?.twoFactorAuthenticationStatus || false,
            },
          });
        }
        else{
          return MessageUtil.error(res,{
            message: RES_MSG.LOGIN_LATER,
            status: RESPONSES.BADREQUEST,
            error: true,
          })
        }
        } else {
          let validationAttempts;
          let userInfo = await userModel.findOne({
            emailAddress: email,
          },)
          if(userInfo){
            if(userInfo?.invalidAttempt != undefined && userInfo?.invalidAttempt < 2){

                     validationAttempts = await userModel.findOneAndUpdate(
                      {
                        emailAddress: email,
                      },
                      {
                        $inc: {
                            invalidAttempt: 1
                          }
                      },
                      {
                        returnOriginal: false,
                      }
                    );
                    return MessageUtil.error(res, {
                      message: RES_MSG.WRONG_PASSWORD,
                      status: RESPONSES.BADREQUEST,
                      error: true,
                      count: validationAttempts?.invalidAttempt
                    });
              }
              else{
                let greyList = await userModel.findOneAndUpdate(
                  {
                    emailAddress: email,
                  },
                  {
                    $set: {
                      greyListedTimestamp: Date.now()
                    }
                  },
                  {
                    returnOriginal: false,
                  }
                );

              }
            }
          // If the password doesn't match, return an error response with an appropriate message.
          return MessageUtil.error(res, {
            message: RES_MSG.GREY_LISTED,
            status: RESPONSES.BADREQUEST,
            error: true
          });
        }
      } else {
        // If no user is found with the given email address, return an error response.
        return MessageUtil.error(res, {
          message: RES_MSG.USER_NOT_FOUND,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
    } catch (error: any) {
      // Catch any errors that occurred during the login process and return an error response.
      return MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function handles retrieving user data based on the provided email address.
  public async getUser(req: Request, res: Response) {
    try {
      // Validating the request data using Joi schema.
      const schema = Joi.object({
        emailAddress: Joi.string().lowercase().required().email(),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      // Find the user by their unique ID and email address in the database
      const user = await userModel.findById({
        _id: req.user._id,
        email: req.user.email,
      });
      if (!user) {
        return MessageUtil.error(res, {
          message: RES_MSG.NO_DATA,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      } else {
        return MessageUtil.success(res, {
          message: RES_MSG.SUCCESS,
          status: RESPONSES.SUCCESS,
          error: false,
          data: {
            emailAddress: user.emailAddress,
            walletAddress: user.walletAddress || "",
            firstName: user.firstName,
            lastName: user.lastName,
            gitHub: user.gitHub || "",
            linkedIn: user.linkedIn || "",
            telegram: user.telegram || "",
            bio: user.bio || "",
            profilePicture: user.profilePicture || "",
          },
        });
      }
    } catch (error: any) {
      // Catch any errors that occurred during the data retrieval process and return an error response.
      return MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function handles updating the user's password.
  public async updatePassword(req: Request, res: Response) {
    try {
      // Validating the request data using Joi schema.
      const schema = Joi.object({
        emailAddress: Joi.string().lowercase().required().email(),
        oldPassword: Joi.string()
          .required()
          .error(new Error("Please enter old password")),
        newPassword: Joi.string()
          .trim()
          .required()
          // .pattern(/^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,25}$/)
          .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,25}$/)
          
          .error(new Error("Password validation failed")),
        confirmPassword: Joi.string()
          .trim()
          .required()
          // .pattern(/^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,25}$/)
          .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,25}$/)
          .error(new Error("Confirm Password validation failed")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      // Find the user by their unique ID in the database.
      await userModel
        .findById({
          _id: req.user._id,
        })
        .then(async (result) => {
          // Compare the old password provided in the request with the password stored in the database.
          let ismatch = await bcrypt.compare(
            req.body.newPassword,
            String(result?.password)
          );
          let isoldmatch = await bcrypt.compare(
            req.body.oldPassword,
            String(result?.password)
          );
          // If the old password does not match, throw an error indicating invalid old password.
          if (!isoldmatch) {
            throw {
              status: RESPONSES.BADREQUEST,
              error: true,
              message: RES_MSG.INVALID_OLD_PASSWORD,
            };
          }
          // Check if the new password and the confirm password match.
          if (req.body.newPassword != req.body.confirmPassword) {
            throw {
              status: RESPONSES.BADREQUEST,
              error: true,
              message: RES_MSG.PASSWORD_MISMATCHED,
            };
          }
          if (!ismatch) {
            // If the old password matches and new passwords does not match, update the password in the database.
            // Hash the new password and set it as the updated password.
            const salt = await bcrypt.genSalt(Number(10));
            const hashedPassword = await bcrypt.hash(
              req.body.newPassword,
              salt
            );
            const obj = {
              password: hashedPassword,
            };
            await userModel
              .findOneAndUpdate(
                {
                  _id: req.user._id,
                },
                {
                  $set: obj,
                }
              )
              .then(async (response) => {
                // Return a success response with the updated user data.
                return MessageUtil.success(res, {
                  message: RES_MSG.PASSWORD_UPDATED,
                  status: RESPONSES.SUCCESS,
                  error: false,
                  data: {
                    emailAddress: response?.emailAddress,
                    firstName: response?.firstName,
                    lastName: response?.lastName,
                  },
                });
              })
              .catch((err) => {
                // If there is an error during the database update, return an error response with the appropriate message.
                return MessageUtil.error(res, {
                  message: err?.message || RES_MSG.BADREQUEST,
                  status: RESPONSES.BADREQUEST,
                  error: true,
                });
              });
          } else {
            // If there is an error with the request sent regarding the new and confirm password
            return MessageUtil.error(res, {
              message: RES_MSG.SAME_PASSWORD,
              status: RESPONSES.BADREQUEST,
              error: true,
            });
          }
        })
        .catch((err: any) => {
          // Catch any errors that occurred during the database query and return an error response.
          return MessageUtil.error(res, {
            message: err?.message || RES_MSG.BADREQUEST,
            status: RESPONSES.BADREQUEST,
            error: true,
          });
        });
    } catch (error: any) {
      // Catch any errors that occurred during the update process and return an error response.
      return MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async transactionRegister(req: Request, res: Response){
    try{
      const schema = Joi.object({
        emailAddress: Joi.string().lowercase().required().email(),
        txHash: Joi.string().required().error(new Error("No transaction hash ")),
        timestamp: Joi.string().required().error(new Error("Invalid Timestamp")),
        transactionType: Joi.string().required().error(new Error("Invalid Type"))
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
        let obj = {
          emailAddress: req.user.email,
          transactionHash: req.body.txHash,
          timestamp: req.body.timestamp,
          transactionType: req.body.transactionType
        }
      let response = await TransactionModel.create(obj)
      if(!response){
        return MessageUtil.error(res, {
          message: RES_MSG.BADREQUEST,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
      return MessageUtil.error(res, {
        message: RES_MSG.SUCCESS,
        status: RESPONSES.SUCCESS,
        error: false,
        data: response
      });
    }
    catch(error){
      return MessageUtil.error(res, {
        message: error || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async transactionHistory(req: Request, res: Response){
    try{
      const schema = Joi.object({
        emailAddress: Joi.string().lowercase().required().email()
      });

      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };

      const { page, limit }: any = req.query;
      let initialPage = page ? page : 1;
      let initialLimit = limit ? limit : 10;
      let limitOffset: any = (Number(initialPage) - 1) * Number(initialLimit);

        let obj = {
          emailAddress: req.user.email
        }
      let responseCount = await TransactionModel.find(obj).sort({createdAt : -1})
      let response = await TransactionModel.find(obj).sort({createdAt : -1}).skip(limitOffset).limit(initialLimit)
      if(!response){
        return MessageUtil.error(res, {
          message: RES_MSG.BADREQUEST,
          status: RESPONSES.BADREQUEST,
          error: true,
        });
      }
      return MessageUtil.error(res, {
        message: RES_MSG.SUCCESS,
        status: RESPONSES.SUCCESS,
        error: false,
        count: responseCount.length,
        docCount:response.length,
        data: response
      });
    }
    catch(error){
      return MessageUtil.error(res, {
        message: error || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function generates a secret for two-factor authentication and returns a QR code URL containing the secret.
  // The QR code can be scanned by authenticator apps like Google Authenticator to set up two-factor authentication.
  public async twoFactorAuthentication(req: Request, res: Response) {
    try {
      // Validating the request data using Joi schema.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .lowercase()
          .required()
          .email()
          .error(new Error("Invalid Email Address")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      let issuerQr = "AuditBazaar";
      const label = req.user.email;
      // Generate a new secret using the speakeasy library.
      const secret = speakeasy.generateSecret();
      const secretbase32 = secret.base32;
      // Generate an OTP auth URL using the secret, label, and issuer information.
      const url = speakeasy.otpauthURL({
        secret: secret.ascii,
        label: label,
        issuer: issuerQr,
        algorithm: "sha1",
      });
      // Convert the OTP auth URL to a data URI for generating a QR code image.
      const dataJson = await QrCode.toDataURL(url);
      let response = await userModel.findOne({
        emailAddress: req.user.email,
      });
      // Return the response with the generated secret and QR code URL.
      if (response == null) {
        throw {
          message: RES_MSG.USER_NOT_FOUND,
          status: RESPONSES.BADREQUEST,
          error: true,
        };
      }
      return MessageUtil.success(res, {
        status: RESPONSES.SUCCESS,
        error: false,
        data: {
          secret: secretbase32,
          qrImgUrl: dataJson,
          twoFactorAuthenticationStatus: response.twoFactorAuthenticationStatus,
        },
      });
    } catch (error) {
      return MessageUtil.error(res, {
        status: 400,
        error: true,
        message: error,
      });
    }
  }

  // This function verifies the provided one-time password (OTP) against the user's secret for two-factor authentication.
  // If the OTP is valid, it updates the user's two-factor authentication status in the database.
  public async gettwoFAStatus(req: Request, res: Response) {
    try {
      // No Validation required for the request data using Joi schema.
      const data = await userModel.findOne({
        emailAddress: req.user.email.toLowerCase(),
      }).select(["emailAddress","twoFactorAuthenticationStatus","-_id"]).lean();
      // Return success response if the user's 2FA status is found successfully
      return MessageUtil.success(res, {
        status: RESPONSES.SUCCESS,
        error: false,
        message: RES_MSG.TFA_STATUS,
        data:data
      });
    } catch (error) {
      // Catch any errors that occurred during the verification process and return an error response.
      return MessageUtil.error(res, {
        message: RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function verifies the provided one-time password (OTP) against the user's secret for two-factor authentication.
  // If the OTP is valid, it updates the user's two-factor authentication status in the database.
  public async verifytwoFactorAuthentication(req: Request, res: Response) {
    try {
      // Validating the request data using Joi schema.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .lowercase()
          .required()
          .email()
          .error(new Error("Invalid Email Address")),
        secret: Joi.string().required().error(new Error("Invalid Secret")),
        otp: Joi.number().required().error(new Error("Invalid otp")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      const { otp, secret, emailAddress } = req.body;
      // Verify the provided OTP against the user's secret using speakeasy.
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: "base32",
        token: otp,
      });
      if (verified === true) {
        // If the OTP is valid, update the user's two-factor authentication status in the database.
        const update2FA = await userModel.findByIdAndUpdate(req.user._id, {
          twoFactorAuthentication: secret,
          twoFactorAuthenticationStatus: true,
        });

        // Return success response if the OTP is valid and user's two-factor authentication status is updated.
        return MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          message: RES_MSG.TFA_SUCCESS,
          twoFactorAuthenticationStatus: true
        });
      } else {
        // Return an error response if the OTP is invalid.
        return MessageUtil.error(res, {
          message: RES_MSG.TFA_FAIL,
          status: RESPONSES?.BADREQUEST,
          error: true,
        });
      }
    } catch (error) {
      // Catch any errors that occurred during the verification process and return an error response.
      return MessageUtil.error(res, {
        message: RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async disableTwoFactorAuthentication(req: Request, res: Response) {
    try {
      // Validating the request data using Joi schema.
      const schema = Joi.object({
        emailAddress: Joi.string()
          .lowercase()
          .required()
          .email()
          .error(new Error("Invalid Email Address")),
        otp: Joi.number().required().error(new Error("Invalid otp")),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      const { otp, emailAddress } = req.body;
      const userDetails: any = await userModel.findOne({
        _id: req.user._id,
        twoFactorAuthenticationStatus: true,
      });
      // Verify the provided OTP against the user's secret using speakeasy.
      const verified = speakeasy.totp.verify({
        secret: userDetails.twoFactorAuthentication,
        encoding: "base32",
        token: otp,
      });
      if (verified === true) {
        const userDetails: any = await userModel.findOneAndUpdate(
          {
            _id: req.user._id,
            twoFactorAuthenticationStatus: true,
          },
          {
            $set: {
              twoFactorAuthentication: "",
              twoFactorAuthenticationStatus: false,
            },
          },
          {
            returnOriginal: false,
          }
        );
        if (userDetails) {
          return MessageUtil.success(res, {
            message: RES_MSG.TFA_DISABLED,
            error: false,
            status: RESPONSES.SUCCESS,
          });
        }
      } else {
        // Return an error response if the OTP is invalid.
        return MessageUtil.error(res, {
          message: RES_MSG.TFA_FAIL,
          status: RESPONSES?.BADREQUEST,
          error: true,
        });
      }
    } catch (error) {
      return MessageUtil.success(res, {
        message: RES_MSG.BADREQUEST,
        error: true,
        status: RESPONSES.BADREQUEST,
      });
    }
  }

  // This function verifies the provided one-time password (OTP) against the user's secret for two-factor authentication during login.
  public async logintwoFactorAuthentication(req: Request, res: Response) {
    try {
      const userDetails: any = await userModel.findOne({
        _id: req.user._id,
        twoFactorAuthenticationStatus: true,
      });
      // Verify the provided OTP against the user's secret using speakeasy.
      const verified = speakeasy.totp.verify({
        secret: userDetails.twoFactorAuthentication,
        encoding: "base32",
        token: req.body.otp,
      });
      const data = await userModel.findOne({ emailAddress: req.user.email });

      if (verified === true && data?.greyListed2faTimestamp != undefined) {
          if(Date.now() - data.greyListed2faTimestamp >= (2*3600*1000)){
            let validationAttempts = await userModel.findOneAndUpdate(
              {
                emailAddress: req.user.email,
              },
              {
                $set: 
                { 
                  invalid2faAttempt: 0,
                  greyListed2faTimestamp: 0
                 },
              },
              {
                returnOriginal: false,
              }
              );
            // If the OTP is valid, return a success response.
            return MessageUtil.success(res, {
              status: RESPONSES.SUCCESS,
              error: false,
              message: RES_MSG.LOGIN_SUCCESS,
            });
          }
          else{
            return MessageUtil.error(res,{
              message: RES_MSG.LOGIN_LATER,
              status: RESPONSES.BADREQUEST,
              error: true,
            })
          }
      } else {
        let validationAttempts;
        let userInfo = await userModel.findOne({
          emailAddress: req.user.email,
        },)
        if(userInfo){
          if(userInfo?.invalid2faAttempt != undefined && userInfo?.invalid2faAttempt < 2){

                   validationAttempts = await userModel.findOneAndUpdate(
                    {
                      emailAddress: req.user.email,
                    },
                    {
                      $inc: {
                        invalid2faAttempt: 1
                        }
                    },
                    {
                      returnOriginal: false,
                    }
                  );

            // Return an error response if the OTP is invalid.
            return MessageUtil.error(res, {
              message: RES_MSG.TFA_FAIL,
              status: RESPONSES?.BADREQUEST,
              error: true,
              count: validationAttempts?.invalid2faAttempt
            });
          }
          else{
            let greyList = await userModel.findOneAndUpdate(
              {
                emailAddress: req.user.email,
              },
              {
                $set: {
                  greyListed2faTimestamp: Date.now()
                }
              },
              {
                returnOriginal: false,
              }
            );
            // If the password doesn't match, return an error response with an appropriate message.
            return MessageUtil.error(res, {
              message: RES_MSG.GREY_LISTED,
              status: RESPONSES.BADREQUEST,
              error: true
            });
          }
        }
      }
    } catch (error) {
      // Catch any errors that occurred during the verification process and return an error response.
      return MessageUtil.error(res, {
        message: RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      let schema = Joi.object({
        emailAddress: Joi.string()
          .email()
          .required()
          .error(new Error("Invalid Email Address")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      }
      let response = await jwtSeizeModel.findOneAndUpdate(
        {
          emailAddress: (req.user.email).toLowerCase(),
          jwtToken: req.headers.authorization,
          jwtStatus: "LOGGED_IN",
        },
        {
          $set: {
            jwtStatus: "LOGGED_OUT",
          },
        },
        {
          returnOriginal: false,
        }
      );
      if (response?.jwtStatus == "LOGGED_OUT") {
        return MessageUtil.success(res, {
          status: RESPONSES.SUCCESS,
          error: false,
          message: RES_MSG.LOGOUT_SUCCESS,
        });
      }
    } catch (error) {
      return MessageUtil.error(res, {
        message: RES_MSG.BADREQUEST,
        status: RESPONSES.BADREQUEST,
        error: true,
      });
    }
  }
}

export default new UserProfile();