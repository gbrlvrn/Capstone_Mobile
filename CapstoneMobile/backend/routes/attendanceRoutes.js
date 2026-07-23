import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { checkIn, getHistory, getStats, scanQR } from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/attendance/check-in", authMiddleware, checkIn);
router.get("/attendance/history", authMiddleware, getHistory);
router.get("/attendance/stats", authMiddleware, getStats);
router.post("/attendance/scan-qr", authMiddleware, scanQR);

export default router;
