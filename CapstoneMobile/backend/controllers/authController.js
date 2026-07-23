// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { sendOtpEmail } from "../utils/mailer.js";

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * ✅ GET /api/auth/exists?email=...
 */
export async function checkEmailExists(req, res) {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email }).select("_id");
    return res.json({ exists: !!user });
  } catch (err) {
    console.error("CHECK EMAIL ERROR:", err);
    return res.status(500).json({ message: "Failed to check email." });
  }
}

/**
 * ✅ GET /api/auth/profile?email=...
 * Returns user info (SAFE fields only)
 */
export async function getProfile(req, res) {
  try {
    // Use email from JWT token if available, otherwise from query
    const email = req.user?.email || (req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email }).select(
      "firstName lastName fullName email phone branch position gender birthday role verificationStatus profilePhoto createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    const isNonMemberPosition = user.position && !['Member', 'member', ''].includes(user.position);

    if ((user.verificationStatus === "approved" || isNonMemberPosition) && user.role !== "officer") {
      await User.updateOne({ email }, { role: "officer", verificationStatus: "approved", isVerified: true });
      user.role = "officer";
      user.verificationStatus = "approved";
    }

    return res.json({ user });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    return res.status(500).json({ message: "Failed to load profile." });
  }
}

/**
 * ✅ POST /api/auth/signup
 */
export async function signup(req, res) {
  try {
    const firstName = (req.body.firstName || "").trim();
    const lastName = (req.body.lastName || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const phone = (req.body.phone || "").trim();
    const branch = (req.body.branch || "").trim();
    const gender = (req.body.gender || "").trim();
    const birthday = (req.body.birthday || "").trim();
    const password = (req.body.password || "").trim();
    const role = (req.body.role || "member").trim().toLowerCase();
    const churchId = (req.body.churchId || "").trim();
    const position = (req.body.position || "").trim();

    if (!firstName || !lastName) return res.status(400).json({ message: "First and Last names are required." });
    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!phone) return res.status(400).json({ message: "Phone is required." });
    if (!gender) return res.status(400).json({ message: "Gender is required." });
    if (!birthday) return res.status(400).json({ message: "Birthday is required." });
    if (!password) return res.status(400).json({ message: "Password is required." });

    // Disposable email check backend
    const domain = email.split('@')[1];
    const blockedDomains = ["mailinator.com", "yopmail.com", "tempmail.com", "guerrillamail.com"];
    if (blockedDomains.includes(domain)) {
      return res.status(400).json({ message: "Disposable emails are not allowed." });
    }

    // Officer-specific validation
    if (role === "officer") {
      if (!churchId) return res.status(400).json({ message: "Church ID is required for officers." });
      if (!position) return res.status(400).json({ message: "Position is required for officers." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const isOfficer = role === "officer";

    const user = await User.create({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
      branch,
      gender,
      birthday,
      passwordHash,
      role: isOfficer ? "officer" : "member",
      churchId: isOfficer ? churchId : "",
      position: isOfficer ? position : "",
      verificationStatus: isOfficer ? "approved" : "none",
      isVerified: isOfficer,
    });

    // Generate JWT token on signup
    const token = generateToken(user);

    return res.status(201).json({
      message: "Signup successful.",
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
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({ message: "Signup failed: " + err.message });
  }
}

/**
 * ✅ POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res) {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();

    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!password) return res.status(400).json({ message: "Password is required." });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user);

    return res.json({
      message: "Login successful.",
      token,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Login failed." });
  }
}

/**
 * ✅ DELETE /api/auth/delete
 * Body: { email }
 */
export async function deleteAccount(req, res) {
  try {
    const email = req.user?.email || (req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    await User.deleteOne({ email });

    return res.json({
      message: "Account deleted successfully.",
    });
  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err);
    return res.status(500).json({ message: "Failed to delete account." });
  }
}


/**
 * ✅ POST /api/auth/upload-photo
 * Multipart form data with "photo" file field
 */
export async function uploadProfilePhoto(req, res) {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: "Email is required." });

    if (!req.file) {
      return res.status(400).json({ message: "No photo file uploaded." });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    await User.updateOne({ email }, { profilePhoto: photoUrl });

    return res.json({ message: "Profile photo updated.", profilePhoto: photoUrl });
  } catch (err) {
    console.error("UPLOAD PHOTO ERROR:", err);
    return res.status(500).json({ message: "Failed to upload photo." });
  }
}

/**
 * ✅ POST /api/auth/push-token
 * Body: { token }
 */
export async function registerPushToken(req, res) {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const token = (req.body.token || "").trim();
    if (!token) return res.status(400).json({ message: "Push token is required." });

    await User.updateOne({ email }, { expoPushToken: token });
    return res.json({ message: "Push token registered." });
  } catch (err) {
    console.error("PUSH TOKEN ERROR:", err);
    return res.status(500).json({ message: "Failed to register push token." });
  }
}

/**
 * ✅ POST /api/auth/forgot-password
 * Body: { email }
 * Checks the email exists, then sends a 6-digit OTP.
 */
export async function forgotPassword(req, res) {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email }).select("_id");
    if (!user) {
      // Deliberately vague so we don't leak registered emails
      return res.status(404).json({ message: "No account found with that email." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.findOneAndUpdate(
      { email },
      { otp: code, expiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    await sendOtpEmail({ to: email, otp: code });

    return res.json({ message: "OTP sent to email." });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Failed to send reset OTP." });
  }
}

/**
 * ✅ POST /api/auth/reset-password
 * Body: { email, otp, newPassword }
 * Verifies the OTP, then updates the password hash.
 */
export async function resetPassword(req, res) {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const otp   = (req.body.otp   || "").trim();
    const newPassword = (req.body.newPassword || "").trim();

    if (!email)       return res.status(400).json({ message: "Email is required." });
    if (!otp)         return res.status(400).json({ message: "OTP is required." });
    if (!newPassword) return res.status(400).json({ message: "New password is required." });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

    const record = await Otp.findOne({ email });
    if (!record) return res.status(400).json({ message: "OTP not found. Please request a new one." });

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (record.attempts >= 5) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP." });
    }

    // OTP is valid — delete it and update password
    await Otp.deleteOne({ _id: record._id });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { passwordHash });

    return res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Failed to reset password." });
  }
}
