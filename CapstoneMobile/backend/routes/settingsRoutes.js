import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// GET public settings (e.g. payment approval method)
router.get("/settings/public", async (req, res) => {
  try {
    const config = await mongoose.connection.collection("settings").findOne({ _id: "global" });
    const method = config?.paymentApprovalMethod || "gateway";
    res.json({ success: true, paymentApprovalMethod: method });
  } catch (error) {
    console.error("Failed to fetch public settings:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
