import { Request, Response } from "express";
import { MessageUtil } from "../../utils/message";
import { RESPONSES, RES_MSG } from "../../constant/response";
import userModel from "../../models/user.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Joi from "joi";
import sendEmail from "../../helpers/mailHelper";
import speakeasy from "speakeasy";
import QrCode from "qrcode";

class UserProfile {

  // This function handles the registration of a new user.
  public async registerUser(req: Request, res: Response) {
    try {
      // Validating the request data using Joi schema.
      const schema = Joi.object({
        emailAddress: Joi.string().required().email().error(new Error("Please enter a valid email")),
        firstName: Joi.string().trim().required().pattern(/^[a-zA-Z!@#$%^&*]+$/).max(25).error(new Error("Please enter a valid first name")),
        lastName: Joi.string().trim().allow("").pattern(/^[a-zA-Z]+$/).max(25).error(new Error("Last Name validation failed")),
        password: Joi.string().trim().required().pattern(/^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,25}$/).error(new Error("Please enter a valid password")),
        confirmPassword: Joi.string().trim().required().pattern(/^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,15}$/).error(new Error("Please enter a valid confirmed password")),
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
      const data = await userModel.findOne({emailAddress: req.body.emailAddress})
      // If not, throw an error with the corresponding message.
      if(data){
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: RES_MSG.REGISTER_DUPLICACY,
        };
      }
      // Check if the password and confirmed password match.
      if (req.body.password != req.body.confirmPassword) return MessageUtil.error(res, {
        message: RES_MSG.PASSWORD_MISMATCHED,
        status: RESPONSES.BADREQUEST,
        error: true,
      });
      // If the password and confirmed password match, hash the password and proceed with registration.
      const salt = await bcrypt.genSalt(Number(10));
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      const obj = {
        emailAddress: req.body.emailAddress.toLowerCase(),
        firstName: req.body.firstName ? req.body.firstName : null,
        lastName: req.body.lastName ? req.body.lastName : null,
        password: hashedPassword,
      };
      // Create a new user document in the database.
      await userModel.create(obj).then((resp: any) => {
        const token = jwt.sign(
          {
            email: req.body.emailAddress,
            _id: resp._id,
          },
          req.body.emailAddress,
          {
            expiresIn: "8h",
          }
        );
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
      // If there is an error during user creation, return an error response with the corresponding message.
      }).catch((error: any) => {
        return MessageUtil.error(res, {
          message: RES_MSG.REGISTER_DUPLICACY,
          status: RESPONSES.BADREQUEST,
          error: error
        })
      })
    } 
    // Catch any errors that occurred during the registration process and return an error response.
    catch (error: any) {
      return MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function handles updating the user profile.
  public async updateProfile(req: Request, res: Response) {
    try {
      // Define a Joi schema to validate the request data.
      const schema = Joi.object({
        emailAddress: Joi.string().trim().email().allow("").error(new Error("EmailAddress validation failed")),
        walletAddress: Joi.string().trim().lowercase().length(48).allow("").error(new Error("WalletAddress validation failed")),
        firstName: Joi.string().trim().max(25).pattern(/^[a-zA-Z!@#$%^&*]+$/).max(25).error(new Error("First Name validation failed")),
        lastName: Joi.string().trim().allow("").max(25).pattern(/^[a-zA-Z!@#$%^&*]+$/).max(25).error(new Error("Last Name validation failed")),
        gitHub: Joi.string().trim().allow("").pattern(/^(https?:\/\/)?(www\.)?github\.com\/[^\s/]+$/).error(new Error("Invalid GitHub link")),
        linkedIn: Joi.string().trim().allow("").pattern(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+$/).error(new Error("Invalid linkedIn link")),
        telegram: Joi.string().trim().allow("").pattern(/^https:\/\/t\.me\/[A-Za-z0-9_]+$/).error(new Error("Invalid telegram link")),
        bio: Joi.string().trim().allow(""),
        profilePicture: Joi.string().trim().allow(""),
      });
      const { error } = schema.validate(req.body);
      // If validation fails, throw an error with the corresponding message.
      if (error)
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      // Update the user's profile in the database using the updated data provided in the request.
      const data = await userModel.findOneAndUpdate(
        {
          _id: req.user._id,
        },
        {
          $set: req.body,
        },
        {
          returnOriginal: false,
        }
      );
      
      // Return a success response with the updated user profile data.
      return MessageUtil.success(res, {
        message: RES_MSG.SUCCESS,
        status: RESPONSES.SUCCESS,
        error: false,
        data: {
          emailAddress: data?.emailAddress,
          walletAddress: data?.walletAddress || "",
          firstName: data?.firstName,
          lastName: data?.lastName,
          gitHub: data?.gitHub || "",
          linkedIn: data?.linkedIn || "",
          telegram: data?.telegram || "",
          bio: data?.bio || "",
          profilePicture: data?.profilePicture || ""
        }
      });
    } 
    // Catch any errors that occurred during the update process and return an error response.
    catch (error: any) {
      return MessageUtil.error(res, {
        message: error?.message || RES_MSG.INTERNAL_SERVER_ERROR,
        status: RESPONSES?.INTERNALSERVER,
        error: true,
      });
    }
  }

  // This function handles user login.
  public async login(req: Request, res: Response) {
    try {
      // Define a Joi schema to validate the login request data.
      const schema = Joi.object({
        emailAddress: Joi.string().lowercase().required().email().error(new Error(" enter a valid email")),
        password: Joi.string().trim().required().error(new Error(" enter a valid password"))
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
          token = jwt.sign(
            {
              email: email,
              _id: data._id,
            },
            email,
            {
              expiresIn: "8h",
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
              profilePicture: data?.profilePicture || ""
            },
          });
        }
        else {
          // If the password doesn't match, return an error response with an appropriate message.
          return MessageUtil.error(res, {
            message: RES_MSG.WRONG_PASSWORD,
            status: RESPONSES.BADREQUEST,
            error: true,
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
    } 
    // Catch any errors that occurred during the login process and return an error response.
    catch (error: any) {
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
      await userModel
        .findById({
          _id: req.user._id,
          email: req.user.email,
        })
        .then((response) => {
          // If the user is found, return a success response with the user's data.
          return MessageUtil.success(res, {
            message: RES_MSG.SUCCESS,
            status: RESPONSES.SUCCESS,
            error: false,
            data: {
              emailAddress: response?.emailAddress,
              walletAddress: response?.walletAddress || "",
              firstName: response?.firstName,
              lastName: response?.lastName,
              gitHub: response?.gitHub || "",
              linkedIn: response?.linkedIn || "",
              telegram: response?.telegram || "",
              bio: response?.bio || "",
              profilePicture: response?.profilePicture || ""
            },
          });
        })
        .catch((err) => {
          // If there is an error during the database query, return an error response with the appropriate message.
          return MessageUtil.error(res, {
            message: err?.message || RES_MSG.NO_DATA,
            status: RESPONSES.BADREQUEST,
            error: true,
          });
        });
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
        oldPassword: Joi.string().required().error(new Error("Please enter old password")),
        newPassword: Joi.string().trim().required().pattern(/^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,25}$/).error(new Error("Password validation failed")),
        confirmPassword: Joi.string().trim().required().pattern(/^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,25}$/).error(new Error("Confirm Password validation failed"))
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
          if(!isoldmatch){
            throw {
              status: RESPONSES.BADREQUEST,
              error: true,
              message: RES_MSG.INVALID_OLD_PASSWORD,
            };
          }
          // Check if the new password and the confirm password match.
          if(req.body.newPassword != req.body.confirmPassword){
            throw {
              status: RESPONSES.BADREQUEST,
              error: true,
              message: RES_MSG.PASSWORD_MISMATCHED
            }
          }
          if(!ismatch){
            // If the old password matches and new passwords match, update the password in the database.
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
                  message: RES_MSG.SUCCESS,
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
 
// This function generates a secret for two-factor authentication and returns a QR code URL containing the secret.
// The QR code can be scanned by authenticator apps like Google Authenticator to set up two-factor authentication.
public async twoFactorAuthentication(req: Request, res: Response) {
  try {
    let issuerQr = "AuditBazaar";
    const label = req.body.emailAddress;
    
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
    
    // Return the response with the generated secret and QR code URL.
    return MessageUtil.success(res, {
      status: RESPONSES.SUCCESS,
      error: false,
      data:{
      secret: secretbase32,
      qrImgUrl: dataJson,
      }
    });
  } catch (error) {
    return MessageUtil.error(res,{
      status: 400,
      error: true, 
      message: error 
    })
  }
};

// This function verifies the provided one-time password (OTP) against the user's secret for two-factor authentication.
// If the OTP is valid, it updates the user's two-factor authentication status in the database.
public async verifytwoFactorAuthentication(req: Request, res: Response) {
  try {
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
      });
    } else {
      // Return an error response if the OTP is invalid.
      return MessageUtil.error(res, {
        message: RES_MSG.TFA_FAIL,
        status: RESPONSES?.SUCCESS,
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
};

// This function verifies the provided one-time password (OTP) against the user's secret for two-factor authentication during login.
public async logintwoFactorAuthentication(req: Request, res: Response){
  try {
    const user = req.user;
    const userToken = req.body.otp;
    const secretAscii = user.twoFactorAuthentication;
    
    // Verify the provided OTP against the user's secret using speakeasy.
    const verified = speakeasy.totp.verify({
      secret: secretAscii,
      encoding: "base32",
      token: userToken,
    });
    
    if (verified === true) {
      // If the OTP is valid, return a success response.
      return MessageUtil.success(res, {
        status: RESPONSES.SUCCESS,
        error: false,
        message: RES_MSG.TFA_SUCCESS,
      });
    } else {
      // Return an error response if the OTP is invalid.
      return MessageUtil.error(res, {
        message: RES_MSG.TFA_FAIL,
        status: RESPONSES?.SUCCESS,
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
};

}

export default new UserProfile();
