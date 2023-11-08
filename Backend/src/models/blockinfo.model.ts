import * as mongoose from "mongoose";
const BlockInfoModel = new mongoose.Schema(
  {
    eventName: { type: String, require: true },
    blockNumber: { type: Number, require: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("block", BlockInfoModel);