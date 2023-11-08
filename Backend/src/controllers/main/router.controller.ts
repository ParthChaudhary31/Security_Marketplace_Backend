import Router from "express";
import healthCheckController from "../healthCheck.controller";
import fileUpload from "express-fileupload";
import UserProfile from "./controller";
import postAudit from "./postControl"
import jwtValidate from "../../middlewares/jwtValidate"
import jobsControl from "./jobsControl";
import arbiterControl from "./arbiterControl";

const router :any= Router();
router
.get("/healthCheck",healthCheckController.healthCheck)
.post("/register",UserProfile.registerUser)
.post("/login",UserProfile.login)
.all("/*",jwtValidate)
.post("/submitAuditReport",fileUpload(), jobsControl.submitAuditReport)
.post("/updateProfile",fileUpload(),UserProfile.updateProfile)
.post("/removeProfilePicture",UserProfile.removeProfilePicture)
.post("/logout",UserProfile.logout)
.post("/getUserInfo",UserProfile.getUser)
.post("/updatePassword",UserProfile.updatePassword)
.post("/registerAudit", postAudit.registerAudit)
.post("/confirmPost", postAudit.confirmPost)
.post("/updateSalt", postAudit.updateSalt)
.post("/updateAuditStatus",postAudit.updateAuditStatus)
.post("/updateAuditStatusAfterClaim", postAudit.updateAuditStatusAfterClaim)
.post("/updateAuditorID",postAudit.updateAuditorID)
.post("/getDetailsOfAllAuditsPublic", postAudit.getDetailsOfAllAuditsPublic)
.post("/getDetailsOfAllAudits",postAudit.getDetailsOfAllAudits)
.post("/getDetailsOfAudit",postAudit.getDetailsOfAudit)
.post("/twoFactorAuthentication",UserProfile.twoFactorAuthentication)
.post("/gettwoFAStatus",UserProfile.gettwoFAStatus)
.post("/verifytwoFactorAuthentication",UserProfile.verifytwoFactorAuthentication)
.post("/logintwoFactorAuthentication",UserProfile.logintwoFactorAuthentication)
.post("/disableTwoFactorAuthentication",UserProfile.disableTwoFactorAuthentication)
.post("/requestForAudit",jobsControl.requestForAudit)
.post("/deleteBidRequest",postAudit.deleteBidRequest)
.post("/getBidsOfMyRequest", postAudit.getBidsOfMyRequest)
.post("/getDetailsOfMyAllbids", jobsControl.getDetailsOfMyAllbids)
.post("/confirmSubmit",jobsControl.confirmSubmit)
.post("/updateBidStatus", jobsControl.updateBidStatus)
.post("/extendTimeline",jobsControl.ExtendTimeline)
.post("/setExtendTimelineData",jobsControl.setExtendTimelineData)
.post("/selectArbiters",arbiterControl.selectArbitors)
.post("/getArbitorSpecificPosts",postAudit.getArbitorSpecificPost)
.post("/viewArbiterationDetails",arbiterControl.viewArbiterationDetails)
.post("/voteForPost",arbiterControl.voteForPost)
.post("/transactionRegister",UserProfile.transactionRegister)
.post("/transactionHistory",UserProfile.transactionHistory)
export default router;