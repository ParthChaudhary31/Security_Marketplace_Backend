import express, { Application } from "express";
import mainRouter from "./controllers/main/router.controller";

export default function router(server: Application): void {
  server.use("/api/v1", mainRouter);
}
