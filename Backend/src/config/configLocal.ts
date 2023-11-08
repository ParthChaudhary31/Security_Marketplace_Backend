import dotenv from "dotenv";

dotenv.config();
const config = {
  MONGO_URL: process.env.MONGO_URL,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  Arbiters : {
    Arbiter1 : process.env.ARBITER_1,
    Arbiter2 : process.env.ARBITER_2,
    Arbiter3 : process.env.ARBITER_3,
    Arbiter4 : process.env.ARBITER_4,
    Arbiter5 : process.env.ARBITER_5,
  },
  WEB_SOCKET: process.env.WEB_SOCKET,
  VOTING_ADDRESS:process.env.VOTING_ADDRESS,
  ESCROW_CONTRACT:process.env.ESCROW_CONTRACT,
  SECRET_KEY: process.env.SECRET_KEY
}
export default config;
