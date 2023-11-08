import mongoose from "mongoose";
const arbitersList = new mongoose.Schema({
  arbiter: {
    type: String,
    required: true,
  },
  vote: {
    type: Boolean,
    default: false,
  },
  voteType: {
    type: Number,
    enum: [
      1,
      2,
      3,
      4
    ],
    default: 0,
  },
});

const postsModel = new mongoose.Schema(
  {
    emailAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "PRE_REGISTERATION",
        "PENDING",
        "IN_PROGRESS",
        "SUBMITTED",
        "UNDER_ARBITERATION",
        "COMPLETED",
        "FAILED",
      ],
      default: "PRE_REGISTERATION",
    },
    auditType: [
      {
        type: String,
        requred: false,
        default: "",
      },
    ],
    gitHub: {
      type: String,
      required: true,
      default: "",
    },
    offerAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    postID: {
      type: Number,
      requred: true,
      unique: true,
    },
    estimatedDelivery: {
      type: String,
      required: true,
      default: "",
    },
    description: {
      type: String,
      required: true,
      default: "",
    },
    socialLink: {
      type: String,
      required: false,
      default: "",
    },
    auditorEmail: {
      type: String,
      required: false,
      default: "",
    },
    submit: [{
      type: String,
      required: false,
      default: "",
    }],
    reason: {
      type: String,
      required: false,
      default: "",
    },
    txHash: {
      type: String,
      default: "",
    },
    salt: {
      type: Number,
      required: true,
      unique: true,
    },
    currentAuditId: {
      type: Number,
      required: false,
    },
    extensionRequest: {
      type: Boolean,
      require: true,
      default: false,
    },
    new: {
      type: Boolean,
      require: true,
      default: false,
    },
    arbitersList: {
      type: [arbitersList],
      required: false,
      default: [],
    },
    timeOfArb: {
      type: Number,
      default: 0,
    },
    voteCount: {
      type: Number,
      default: 0,
    },
    voteID: {
      type: Number,
      default: 0,
    },
    totalRewardForArbiters: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, versionKey: false }
);
export default mongoose.model("posts", postsModel);