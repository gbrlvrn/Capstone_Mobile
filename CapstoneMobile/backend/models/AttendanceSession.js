import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    branch: { type: String, required: true },
    serviceType: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    startDateTime: { type: Date, required: true },
    gracePeriodMinutes: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
    startedAt: { type: Date, default: Date.now },
    startedBy: { type: String },
    endedAt: { type: Date, default: null },
    stats: {
      total: { type: Number, default: 0 },
      present: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
      absent: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export default mongoose.model("AttendanceSession", attendanceSessionSchema, "attendance_sessions");
