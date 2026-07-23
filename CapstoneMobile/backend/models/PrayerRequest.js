import mongoose from "mongoose";

const prayerRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    displayName: { type: String, default: "Anonymous" },
    isAnonymous: { type: Boolean, default: false },
    request: { type: String, required: true, trim: true },
    prayerCount: { type: Number, default: 0 },
    prayedBy: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true }
);

prayerRequestSchema.index({ createdAt: -1 });

export default mongoose.model("PrayerRequest", prayerRequestSchema);
