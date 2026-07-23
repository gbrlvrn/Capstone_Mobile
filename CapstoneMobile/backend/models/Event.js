import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true },
    time: { type: String, default: "" },
    location: { type: String, default: "" },
    community: { type: String, default: "" },
    rsvps: [
      {
        email: { type: String, required: true, lowercase: true, trim: true },
        headcount: { type: Number, default: 1 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

eventSchema.index({ date: 1 });

export default mongoose.model("Event", eventSchema);
