import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

// Force Node.js to use Google + Cloudflare DNS — fixes SRV lookup timeouts
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
import otpRoutes from "./routes/otpRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import prayerRoutes from "./routes/prayerRoutes.js";
import savingsRoutes from "./routes/savingsRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import loanPaymentRoutes from "./routes/loanPaymentRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use("/uploads", express.static(uploadsDir));

// ── Rate Limiting ──────────────────────────────────────────────────
// General rate limiter: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", generalLimiter);

// Stricter rate limiter for auth routes: 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Too many authentication attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/verify-pin", authLimiter);
app.use("/api/otp", authLimiter);

// ── Routes ─────────────────────────────────────────────────────────
app.use("/api", authRoutes);
app.use("/api", verificationRoutes);
app.use("/api", otpRoutes);
app.use("/api", loanRoutes);
app.use("/api", donationRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", eventRoutes);
app.use("/api", prayerRoutes);
app.use("/api", savingsRoutes);
app.use("/api", announcementRoutes);
app.use("/api", loanPaymentRoutes);
app.use("/api", settingsRoutes);
app.use("/api", chatRoutes);
app.use("/api", branchRoutes);

// ── MongoDB ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/";
const DB_NAME   = process.env.DB_NAME || "faithly";
// Strip trailing slash before appending DB name to avoid double-slash
const MONGO_CONN = MONGO_URI.replace(/\/$/, "") + "/" + DB_NAME;

const MONGO_OPTS = {
  serverSelectionTimeoutMS: 30000,  // 30s to find a primary
  socketTimeoutMS: 45000,           // 45s socket idle timeout
  connectTimeoutMS: 30000,          // 30s initial connection
  retryWrites: true,
};

async function connectMongo(retries = 3, delay = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(MONGO_CONN, MONGO_OPTS);
      console.log("MongoDB connected to:", DB_NAME);
      console.log("  URI cluster:", MONGO_URI.replace(/:([^@]+)@/, ":****@")); // mask password
      return;
    } catch (e) {
      console.error(`MongoDB attempt ${i}/${retries} failed:`, e.message);
      if (i < retries) {
        console.log(`  Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error("MongoDB: all retries exhausted. Server will continue without DB.");
      }
    }
  }
}
connectMongo();

app.get("/", (req, res) => res.send("FaithLy backend running"));

const PORT = parseInt(process.env.PORT) || 5001;
const server = app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT} (0.0.0.0)`)
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌  Port ${PORT} is already in use.\n` +
      `   Another nodemon/node process is still running.\n` +
      `   Killing it and retrying...\n`
    );
    // Use Node's child_process to kill the occupying PID and exit
    // so nodemon will auto-restart cleanly.
    import("child_process").then(({ execSync }) => {
      try {
        if (process.platform === "win32") {
          execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /PID %a /F`, { shell: "cmd.exe" });
        } else {
          execSync(`lsof -ti tcp:${PORT} | xargs kill -9`);
        }
      } catch (_) { /* ignore – process may have already exited */ }
      process.exit(1); // exit so nodemon restarts
    });
  } else {
    throw err;
  }
});

