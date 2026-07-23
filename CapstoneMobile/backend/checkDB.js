import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  verificationStatus: String
}, { strict: false });
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
  const allUsers = await User.find({}, null, { lean: true });
  console.log("All Users in DB:");
  console.log(JSON.stringify(allUsers, null, 2));
  process.exit(0);
}
run();
