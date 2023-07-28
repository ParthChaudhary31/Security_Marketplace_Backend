import mongoose from "mongoose";
import config from "../config/configLocal"

class DbClass {
  dbConnection = async () => {
    // let url = process.env.DBNAME;
    let options: any = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      keepAlive: true,
    };
    
    if (config.MONGO_URL) {
      const connect = await mongoose.connect(config.MONGO_URL, options);
      const db = mongoose.connection;
      db.on("error", console.error.bind(console, "connection error: "));
      db.once("open", function () {
        console.log("Connected successfully");
      });
      mongoose.set("strictQuery", false);
    }
  };
}
export default new DbClass();
