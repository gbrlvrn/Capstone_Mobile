import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createSavingsDeposit, createSavingsTransfer, getSavings, createSavingsGoal, createSavingsWithdrawal } from "../controllers/savingsController.js";

const router = express.Router();

router.post("/savings/deposit", authMiddleware, createSavingsDeposit);
router.post("/savings/transfer", authMiddleware, createSavingsTransfer);
router.post("/savings/goals", authMiddleware, createSavingsGoal);
router.post("/savings/withdraw", authMiddleware, createSavingsWithdrawal);
router.get("/savings", authMiddleware, getSavings);
router.get("/savings/overview", authMiddleware, getSavings); // Web-compatible alias

export default router;
