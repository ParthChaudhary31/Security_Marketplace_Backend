import mongoose from "mongoose";
const postsModel = new mongoose.Schema(
  {
    emailAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "IN_PROGRESS", "SUCCESS", "FAILED"],
      default:"PENDING",
    },
    auditType:[{
      type: String,
      requred: false,
      default: ""
    }],
    gitHub: {
      type: String,
      required:true,
      default: ""
    },
    offerAmount: {
        type: Number,
        required: true,
        default: 0
    },
    postID: {
        type: Number,
        requred: true,
        unique:true
    },
    estimatedDelivery: {
      type: String,
      required: true,
      default: ""
    },
    description: {
      type: String,
      required: true,
      default: ""
    },
    socialLink: {
      type: String,
      required: false,
      default: ""
    },
    auditorEmail: {
      type: String,
      required: false,
      default: ""
    } 
  },
  { timestamps: true, versionKey: false }
);
export default mongoose.model("posts", postsModel);
