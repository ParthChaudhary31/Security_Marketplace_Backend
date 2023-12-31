import express, { Application } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import router from "./router";
import dbConnect from "./helpers/db.helper";
import path from "path";
dotenv.config();

const swaggerui = require("swagger-ui-express");
const swaggerdoc = require("../swagger.json");

class ExpressServer {
  public app: Application;
  private swaggerdoc: any;
  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    dbConnect.dbConnection();
    this.initialiseServices();
    this.initialiseRouter();
    this.app.use("/uploaded/images",
      express.static(path.join(__dirname, "/../public/uploads"))
    );
    this.app.use("/uploaded/submits",
    express.static(path.join(__dirname, "/../public/reports"))
  );
  }

  private initialiseRouter() {
    router(this.app);
    return this;
  }

  private async initialiseServices() {
    this.app.use("/swagger", swaggerui.serve, swaggerui.setup(swaggerdoc));
  }

  public listen(port: number) {
    this.app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }
}

export default new ExpressServer();