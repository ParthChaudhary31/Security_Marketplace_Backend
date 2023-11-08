import mongoose from "mongoose";
const userModel = new mongoose.Schema(
  {
    emailAddress: {
      type: String,
      required: true,
      unique: true,
      // validate: {
      //   validator: (v: any) => ,
      //   message: (props: any) => `${props?.value} is not a valid address`,
      // }
    },
    walletAddress: {
      type: String,
      required: false,
      validate: {
        validator: (v: any) => v.length == 48,
        message: (props: any) => `${props?.value} is not a valid address`,
      }
    },
    firstName: {
      type: String,
      required:true,
      default:""
    },
    lastName: {
      type: String,
      required:false,
      default:""
    },
    gitHub: {
      type: String,
      required:false,
      default:""
    },
    linkedIn: {
      type: String,
      required:false,
      default:""
    },
    telegram: {
      type: String,
      required:false,
      default:""
    },
    bio: {
      type: String,
      required:false,
      default:""
    },
    xp: {
      type: Number,
      required:false,
      default:0
    },
    profilePicture: {
      type: String,
      required: false,
      default: ""
    },
    password:{
      type: String,
      required:true,
    },
    twoFactorAuthentication:{
      type: String,
      required:false,
      default: ""
    },
    twoFactorAuthenticationStatus: {
      type: Boolean,
      required: true,
      default: false
    },
    invalidAttempt: {
      type: Number,
      required:false,
      default:0,
      validate: {
        validator: (v: any) => v <= 2,
        message: (props: any) => `${props?.value} is not a valid number`,
      }
    },
    greyListedTimestamp: {
      type: Number,
      required: false,
      default:0,
    },
    invalid2faAttempt: {
      type: Number,
      required:false,
      default:0,
      validate: {
        validator: (v: any) => v <= 2,
        message: (props: any) => `${props?.value} is not a valid number`,
      }
    },
    greyListed2faTimestamp: {
      type: Number,
      required: false,
      default:0,
    }
  },
  { timestamps: true, versionKey: false }
);
export default mongoose.model("users", userModel);
