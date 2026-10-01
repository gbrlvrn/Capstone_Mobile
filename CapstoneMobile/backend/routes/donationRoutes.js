import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createDonation, getDonations, createDonationValidation, getAcknowledgedDonations } from "../controllers/donationController.js";
import { verifyReceipt } from "../controllers/receiptVerificationController.js";

const router = express.Router();

// Receipt verification (must be before general /donations POST)
router.post("/donations/verify-receipt", authMiddleware, verifyReceipt);
router.post("/donations/validate-receipt", authMiddleware, verifyReceipt);

// Acknowledged donations endpoint (requires auth) — matches web's /donations/acknowledged
router.get("/donations/acknowledged", authMiddleware, getAcknowledgedDonations);

// All donation routes require authentication
router.post("/donations", authMiddleware, createDonationValidation, createDonation);
router.get("/donations", authMiddleware, getDonations);
router.get("/donations/my-donations", authMiddleware, getDonations); // Web-compatible alias

export default router;

