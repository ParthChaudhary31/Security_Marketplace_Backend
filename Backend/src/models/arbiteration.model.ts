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
});

const arbiterationModel = new mongoose.Schema(
  {
    postID: {
      type: Number,
      requred: true,
      unique: true,
    },
    arbitersList: {
      type: [arbitersList],
      required: false,
      default: [],
    },
    timeAtUnderArbiteration: {
      type: Number,
      required: true,
      default: 0,
    },
    forceVoteDeadline: {
      type: Number,
      required: true,
      default: 0,
    },
    currentAuditId:{
      type: Number,
      // required: true,
      default: 0,
    },
    isForceVoted:{
      type:Boolean,
      default:false
    },
    voteID: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true, versionKey: false }
);
export default mongoose.model("arb_posts", arbiterationModel);
