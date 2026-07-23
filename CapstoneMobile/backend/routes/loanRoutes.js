import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createLoan, getLoans, getLoanById, acceptLoan, updateLoanStatus, createLoanValidation } from "../controllers/loanController.js";
import { verifyIdImage } from "../controllers/idVerificationController.js";

const router = express.Router();

// ── ID Verification (Gemini Vision AI) ───────────────────────────────
// POST /api/loans/verify-id — must be before /:id routes to avoid clash
router.post("/loans/verify-id", authMiddleware, verifyIdImage);

// All loan routes require authentication
router.post("/loans", authMiddleware, createLoanValidation, createLoan);
router.post("/loans/apply", authMiddleware, createLoanValidation, createLoan); // Admin spec alias
router.get("/loans", authMiddleware, getLoans);
router.get("/loans/my-loans", authMiddleware, getLoans); // Web-compatible alias
router.get("/loans/:id", authMiddleware, getLoanById);

// Member accepts an approved loan
router.put("/loans/:id/accept", authMiddleware, acceptLoan);

// Admin/system updates loan status (approved, active, rejected, etc.)
router.put("/loans/:id/status", authMiddleware, updateLoanStatus);

export default router;
