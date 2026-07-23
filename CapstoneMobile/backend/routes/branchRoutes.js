import express from "express";
import Branch from "../models/Branch.js";

const router = express.Router();

/**
 * GET /api/public/branches
 * Fetch all active branches grouped by province (if possible) or just a flat list.
 * Per user request: "Huwag ipakita ang mga branches na may status: 'Inactive'."
 */
router.get("/public/branches", async (req, res) => {
  try {
    const branches = await Branch.find({ status: "Active" }).sort({ name: 1 });
    
    // Process branches to ensure they have a province for grouping if missing in DB
    const processedBranches = branches.map(b => {
      const branchObj = b.toObject();
      if (!branchObj.province && branchObj.address) {
        // Fallback: extract province from address (e.g. "Kalinga, CAR" -> "Kalinga")
        branchObj.province = branchObj.address.split(",")[0].trim();
      }
      return branchObj;
    });

    res.json({
      success: true,
      branches: processedBranches
    });
  } catch (error) {
    console.error("Failed to fetch branches:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
