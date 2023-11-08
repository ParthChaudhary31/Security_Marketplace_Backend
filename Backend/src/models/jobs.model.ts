import mongoose from "mongoose";
const extensionDetails = new mongoose.Schema({
  reason:{
    type: String,
    required: true,
    default: ""
  },
  proposedAmount: {
    type: Number,
    default: 0
  },
  proposedDeliveryTime: {
    type: String,
    default: ""
  }
})

const jobsModel = new mongoose.Schema(
  {
    emailAddress: {
      type: String,
      required: true,
    },
    posterEmailAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "CONFIRM", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    isRejected: {
      type: Boolean,
      default: false
    },
    estimatedAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    postID: {
      type: Number,
      requred: true,
    },
    estimatedDelivery: {
      type: String,
      required: true,
      default: "",
    },
    history: {
      type: [extensionDetails],
      required: false,
      default: []
    }
  },
  { timestamps: true, versionKey: false }
);
export default mongoose.model("jobs", jobsModel);
