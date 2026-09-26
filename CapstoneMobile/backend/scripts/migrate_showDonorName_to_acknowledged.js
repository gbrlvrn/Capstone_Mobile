/**
 * One-time migration: Rename showDonorName → acknowledged in the donations collection.
 *
 * Run this once after deploying the updated backend to normalize any existing
 * donations that were created with the old mobile field name.
 *
 * Usage:
 *   node migrate_showDonorName_to_acknowledged.js
 *
 * Requires the MONGO_URI env variable (or edit the connection string below).
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function migrate() {
  if (!MONGO_URI) {
    console.error("❌ No MONGO_URI found in environment. Set it in .env or pass it directly.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db;
  const donations = db.collection("donations");

  // Step 1: Copy showDonorName → acknowledged for any docs that have showDonorName: true
  const setResult = await donations.updateMany(
    { showDonorName: true },
    { $set: { acknowledged: true } }
  );
  console.log(`✅ Set acknowledged=true on ${setResult.modifiedCount} documents`);

  // Step 2: Ensure all docs without acknowledged field get acknowledged: false
  const defaultResult = await donations.updateMany(
    { acknowledged: { $exists: false } },
    { $set: { acknowledged: false } }
  );
  console.log(`✅ Set acknowledged=false (default) on ${defaultResult.modifiedCount} documents`);

  // Step 3: Remove the old showDonorName field
  const unsetResult = await donations.updateMany(
    { showDonorName: { $exists: true } },
    { $unset: { showDonorName: "" } }
  );
  console.log(`✅ Removed showDonorName field from ${unsetResult.modifiedCount} documents`);

  console.log("\n🎉 Migration complete!");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
