import mongoose from "mongoose";
const jwtSeizeModel = new mongoose.Schema(
  {
    emailAddress: {
      type: String,
      required: true,
    },
    jwtToken: {
        type: String,
        required: true,
        unique: true,
    },
    timeStamp:{
        type: String,
        required: true
    },
    jwtStatus: {
      type: String,
      enum: ["LOGGED_IN","LOGGED_OUT"],
      default: "LOGGED_IN"
    }
  },
  { timestamps: true, versionKey: false }
);
export default mongoose.model("jwtSeize", jwtSeizeModel);
