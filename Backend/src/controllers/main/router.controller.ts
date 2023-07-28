import { Application, Router } from "express";
import healthCheckController from "../healthCheck.controller";

import UserProfile from "./controller";
import postAudit from "./postControl"
import jwtValidate from "../../middlewares/jwtValidate"

const router :any= Router();

router
.get("/healthCheck",healthCheckController.healthCheck)
.post("/register",UserProfile.registerUser)
.post("/login",UserProfile.login)
// All the API from this point are validated by JWT middleware
.all("/*",jwtValidate)
.post("/getUserInfo",UserProfile.getUser)
.post("/updateProfile",UserProfile.updateProfile)
.post("/updatePassword",UserProfile.updatePassword)
.post("/registerAudit", postAudit.registerAudit)
.post("/updateAuditStatus",postAudit.updateAuditStatus)
.post("/updateAuditorID",postAudit.updateAuditorID)
.post("/getDetailsOfAllAuditsPublic", postAudit.getDetailsOfAllAuditsPublic)
.post("/getDetailsOfAllAudits",postAudit.getDetailsOfAllAudits)
.post("/getDetailsOfAudit",postAudit.getDetailsOfAudit)
.post("/twoFactorAuthentication",UserProfile.twoFactorAuthentication)
.post("/verifytwoFactorAuthentication",UserProfile.verifytwoFactorAuthentication)
.post("/logintwoFactorAuthentication",UserProfile.logintwoFactorAuthentication)



export default router;