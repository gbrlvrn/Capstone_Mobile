import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer storage for announcement images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `announcement-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

const router = express.Router();

// GET — fetch active announcements (public)
router.get("/announcements", getAnnouncements);

// POST — create announcement with optional image (authenticated)
router.post("/announcements", authMiddleware, upload.single("image"), createAnnouncement);

// PUT — update announcement by ID (authenticated)
router.put("/announcements/:id", authMiddleware, upload.single("image"), updateAnnouncement);

// DELETE — remove announcement by ID (authenticated)
router.delete("/announcements/:id", authMiddleware, deleteAnnouncement);

export default router;
