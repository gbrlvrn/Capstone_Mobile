import express from "express";
import { sendEmailOtp, verifyEmailOtp } from "../controllers/otpController.js";

const router = express.Router();

router.post("/otp/email/send", sendEmailOtp);
router.post("/resend-otp", sendEmailOtp);
router.post("/otp/email/verify", verifyEmailOtp);
router.post("/verify-otp", verifyEmailOtp);

export default router;
