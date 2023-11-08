import * as mongoose from "mongoose";
const TransactionModel = new mongoose.Schema(
  {
    emailAddress: {type: String, require: true},
    transactionHash: { type: String, require: true},
    timestamp: { type: String, require: true},
    transactionType: {type: String, required: true}
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Transactions", TransactionModel);
