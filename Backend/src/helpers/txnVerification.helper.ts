import EventModel from "../models/event.model";
import { RESPONSES, RES_MSG } from "../constant/response";
import { ApiPromise, WsProvider } from "@polkadot/api";

const getCurrentBlock = async () => {
  const wsProvider: any = new WsProvider("wss://rpc.shibuya.astar.network");
  const api: any = await ApiPromise.create({ provider: wsProvider });
  const CurrentBlock: any = await api.rpc.chain.getBlock();
  const currentBlock = convertToNumberWithCommas(
    CurrentBlock.toHuman().block.header.number
  );
  return currentBlock;
};

const convertToNumberWithCommas = (inputString: any) => {
  const cleanString = inputString.replace(/,/g, "");
  const number = parseFloat(cleanString);
  return number;
};

export const verifyTxnHash: any = async (transactionHash: any) => {
  try {
    const eventResponse: any = await EventModel.find({
      transactionHash: transactionHash,
    });
    if (eventResponse.length != 0) {
      let currentBlock = await getCurrentBlock();

      if (Number(eventResponse[0].blockNumber) > Number(currentBlock) - 7) {

        let ress:any = await EventModel.findOneAndUpdate(
          {
            transactionHash: transactionHash,
          },
          {
            $set: {
              isUsed: true,
            },
          },
          {
            returnOriginal: false
          }
        ).exec();        
        // await eventRes.save();

        return {
          message: RES_MSG.EVENT_RETRIVED,
          status: RESPONSES.SUCCESS,
          error: false,
          isValidated: true,
          data: {
            transactionHash: ress.transactionHash,
            blockNumber: ress.blockNumber,
            eventName: ress.eventName,
            auditor: ress.auditor,
            value: ress.value,
            arbiterprovider: ress.arbiterprovider,
            deadline: ress.deadline,
            isUsed: ress.isUsed,
          },
        };
      } else {
        return {
          message: RES_MSG.EVENT_NULL,
          status: RESPONSES?.NOTFOUND,
          error: false,
          isValidated: false,
        };
      }
    }
  } catch (error: any) {
    return {
      message: error?.message || RES_MSG.EVENT_NULL,
      status: RESPONSES?.NOTFOUND,
      error: true,
    };
  }
};
