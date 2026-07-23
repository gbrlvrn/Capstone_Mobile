import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createPayment, getPayments } from "../controllers/loanPaymentController.js";

const router = express.Router();

router.post("/loan-payments", authMiddleware, createPayment);
router.get("/loan-payments/:loanId", authMiddleware, getPayments);

export default router;
