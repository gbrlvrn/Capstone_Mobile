import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, default: "" },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    branch: { type: String, default: "" },
    position: { type: String, default: "" },
    churchId: { type: String, default: "" },
    gender: { type: String, required: true },
    birthday: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["member", "officer"], default: "member" },
    verificationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    isVerified: { type: Boolean, default: false },
    profilePhoto: { type: String, default: "" },
    expoPushToken: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
