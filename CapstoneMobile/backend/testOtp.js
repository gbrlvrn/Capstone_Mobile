import fetch from "node-fetch";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const email = "test@example.com";

// We need to redefine Otp here since importing the esm module directly from commonjs/script might be tricky
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

async function test() {
  console.log("Connecting to", process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });

  const sendRes = await fetch("http://localhost:5000/api/otp/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const sendText = await sendRes.text();
  console.log("Send Response:", sendText);

  const otpRecord = await Otp.findOne({ email });
  console.log("OTP Record in DB immediately after send:", otpRecord);

  if (otpRecord) {
    const verifyRes = await fetch("http://localhost:5000/api/otp/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: otpRecord.otp })
    });
    const verifyText = await verifyRes.text();
    console.log("Verify Response:", verifyText);
  }
  
  process.exit(0);
}
test();
