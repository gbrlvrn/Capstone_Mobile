import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createDonation, getDonations, createDonationValidation } from "../controllers/donationController.js";

const router = express.Router();

// All donation routes require authentication
router.post("/donations", authMiddleware, createDonationValidation, createDonation);
router.get("/donations", authMiddleware, getDonations);
router.get("/donations/my-donations", authMiddleware, getDonations); // Web-compatible alias

export default router;
