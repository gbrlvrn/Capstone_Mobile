import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    type: { type: String, enum: ["check-in", "check-out"], default: "check-in" },
    community: { type: String, default: "" },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    notes: { type: String, default: "" },

    // ── QR / Session-based check-in fields ──────────────────────────
    recordId: { type: String, default: "" },
    sessionId: { type: String, default: "" },
    member: { type: String, default: "" },
    service: { type: String, default: "" },
    branch: { type: String, default: "" },
    userBranch: { type: String, default: "" },
    method: { type: String, default: "" },
    rfidCardId: { type: String, default: null },
    status: { type: String, default: "" },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
  },
  { timestamps: true }
);

// Index for fast lookups by email + date
attendanceSchema.index({ email: 1, createdAt: -1 });
// Index for session-based duplicate checks
attendanceSchema.index({ sessionId: 1, email: 1 });

export default mongoose.model("Attendance", attendanceSchema, "attendance");
