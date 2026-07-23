import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/authMiddleware.js";
import { signup, login, checkEmailExists, getProfile, deleteAccount, uploadProfilePhoto, registerPushToken, forgotPassword, resetPassword } from "../controllers/authController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

const router = express.Router();

// Public routes (no auth required)
router.post("/auth/signup", signup);
router.post("/register", signup);
router.post("/auth/login", login);
router.post("/login", login);
router.get("/auth/exists", checkEmailExists);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);

// Protected routes (auth required)
router.get("/auth/profile", authMiddleware, getProfile);
router.get("/user/:email", authMiddleware, getProfile);
router.get("/me", authMiddleware, getProfile); // Web-compatible alias
router.delete("/auth/delete", authMiddleware, deleteAccount);
router.post("/auth/upload-photo", authMiddleware, upload.single("photo"), uploadProfilePhoto);
router.post("/auth/push-token", authMiddleware, registerPushToken);

export default router;
