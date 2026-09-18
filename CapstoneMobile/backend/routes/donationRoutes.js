import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createDonation, getDonations, createDonationValidation, getPublicDonations } from "../controllers/donationController.js";
import { verifyReceipt } from "../controllers/receiptVerificationController.js";

const router = express.Router();

// Receipt verification (must be before general /donations POST)
router.post("/donations/verify-receipt", authMiddleware, verifyReceipt);

// Public donations endpoint (no auth required) — must be before authenticated routes
router.get("/donations/public", getPublicDonations);

// All donation routes require authentication
router.post("/donations", authMiddleware, createDonationValidation, createDonation);
router.get("/donations", authMiddleware, getDonations);
router.get("/donations/my-donations", authMiddleware, getDonations); // Web-compatible alias

export default router;

