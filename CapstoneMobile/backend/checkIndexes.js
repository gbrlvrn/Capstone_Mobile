import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const Otp = mongoose.models.Otp || mongoose.model("Otp", otpSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
  const indexes = await Otp.collection.indexes();
  console.log("OTP Indexes:", indexes);
  process.exit(0);
}
run();
