import jwt from "jsonwebtoken";
import Otp from "../models/Otp.js";
import User from "../models/User.js";
import { sendOtpEmail } from "../utils/mailer.js";

const OTP_TTL_MINUTES = 5;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ✅ SEND OTP (Email)
export async function sendEmailOtp(req, res) {
  try {
    const rawEmail = req.body?.email;
    const email = (rawEmail || "").trim().toLowerCase();

    if (!email) return res.status(400).json({ message: "Email is required." });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Replace any existing OTP for that email (resend behavior)
    await Otp.findOneAndUpdate(
      { email },
      { otp: code, expiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    await sendOtpEmail({ to: email, otp: code });

    return res.json({ message: "OTP sent to email." });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return res.status(500).json({ message: "Failed to send OTP." });
  }
}

// ✅ VERIFY OTP (Email) — now returns a JWT token for authenticated sessions
export async function verifyEmailOtp(req, res) {
  try {
    console.log("VERIFY REQUEST BODY:", req.body);

    const rawEmail = req.body?.email;
    const email = (rawEmail || "").trim().toLowerCase();
    const otp = (req.body?.otp || "").trim();

    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!otp) return res.status(400).json({ message: "OTP is required." });
    if (otp.length !== 6) return res.status(400).json({ message: "OTP must be 6 digits." });

    const record = await Otp.findOne({ email });
    if (!record) {
      return res.status(404).json({ message: "OTP not found. Please resend." });
    }

    // Expired
    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired. Please resend." });
    }

    // Optional attempt limit
    if (record.attempts >= 5) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(429).json({ message: "Too many attempts. Please resend." });
    }

    // Wrong OTP
    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP." });
    }

    // Success: delete OTP after use
    await Otp.deleteOne({ _id: record._id });

    // Look up the user and return a JWT token so the app can make authenticated calls
    const user = await User.findOne({ email });
    if (user) {
      const token = generateToken(user);
      return res.json({
        message: "OTP verified.",
        token,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          position: user.position,
        },
      });
    }

    // No user yet (signup flow) — just confirm OTP is valid
    return res.json({ message: "OTP verified." });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ message: "Failed to verify OTP." });
  }
}
