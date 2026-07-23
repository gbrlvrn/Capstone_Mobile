import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import VerificationRequest from "../models/VerificationRequest.js";

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed."), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

/**
 * POST /api/verification/submit
 * multipart/form-data: fields + selfie + validId
 */
export async function submitVerification(req, res) {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const churchId = (req.body.churchId || "").trim();
    const position = (req.body.position || "").trim();

    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!churchId) return res.status(400).json({ message: "Church ID is required." });
    if (!position) return res.status(400).json({ message: "Position is required." });

    // Files are no longer checked for verification


    // Check user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Account not found." });

    // Check if already pending
    if (user.verificationStatus === "pending") {
      return res.status(409).json({ message: "You already have a pending verification request." });
    }

    // Check if already approved
    if (user.verificationStatus === "approved" || user.role === "officer") {
      return res.status(409).json({ message: "You are already verified." });
    }

    // Create verification request
    const verReq = await VerificationRequest.create({
      email,
      churchId,
      position,
    });

    // Update user status
    user.verificationStatus = "pending";
    await user.save();

    return res.status(201).json({
      message: "Verification submitted. Please wait up to 1-2 days for admin review.",
      requestId: verReq._id,
    });
  } catch (err) {
    console.error("SUBMIT VERIFICATION ERROR:", err);
    return res.status(500).json({ message: err.message || "Failed to submit verification." });
  }
}

/**
 * GET /api/verification/status?email=...
 */
export async function getVerificationStatus(req, res) {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email }).select("role verificationStatus position firstName lastName");
    if (!user) return res.status(404).json({ message: "Account not found." });

    let currentRole = user.role;
    let currentStatus = user.verificationStatus;

    const isNonMemberPosition = user.position && !['Member', 'member', ''].includes(user.position);

    if ((user.verificationStatus === "approved" || isNonMemberPosition) && currentRole !== "officer") {
      await User.updateOne({ email }, { role: "officer", verificationStatus: "approved", isVerified: true });
      currentRole = "officer";
      currentStatus = "approved";
    }

    // Find latest request
    const latestReq = await VerificationRequest.findOne({ email })
      .sort({ submittedAt: -1 })
      .select("status submittedAt reviewedAt");

    return res.json({
      role: currentRole,
      verificationStatus: currentStatus,
      position: user.position || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      request: latestReq || null,
    });
  } catch (err) {
    console.error("GET VERIFICATION STATUS ERROR:", err);
    return res.status(500).json({ message: "Failed to check status." });
  }
}
