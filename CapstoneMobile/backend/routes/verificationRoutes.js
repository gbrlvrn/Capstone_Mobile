import express from "express";
import { upload, submitVerification, getVerificationStatus } from "../controllers/verificationController.js";

const router = express.Router();

// Submit verification request (no files required anymore)
router.post(
  "/verification/submit",
  upload.none(),
  submitVerification
);

// Check verification status
router.get("/verification/status", getVerificationStatus);

export default router;
