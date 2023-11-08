import * as mongoose from "mongoose";
const EventModel = new mongoose.Schema(
  {
    transactionHash: { type: String, require: true },
    blockNumber: { type: String, require: true },
    eventName: { type: String, require: true },
    parton: { type: String, require: true },
    auditor: { type: String, require: true },
    value: { type: String, require: true },
    arbiterprovider: { type: String, require: true },
    deadline: { type: String, require: true },
    startTimercurrentstatus: { type: String, require: true },
    isUsed:{type: Boolean,require:true,default: false}
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("events", EventModel);