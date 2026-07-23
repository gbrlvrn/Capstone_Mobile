import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    date: { type: Date },
    time: { type: String, default: "" },
    location: { type: String, default: "" },
    image: { type: String, default: "" },
    category: { type: String, default: "General", trim: true },
    color: { type: String, default: "rgba(46,107,240,0.1)" },
    bordercolor: { type: String, default: "#2E6BF0" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Map _id to id so frontend can consume it seamlessly
announcementSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

export default mongoose.model("Announcement", announcementSchema);
