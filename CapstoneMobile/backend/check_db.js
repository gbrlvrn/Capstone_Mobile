import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const MONGO_CONN = (process.env.MONGODB_URI || "mongodb://localhost:27017/") + (process.env.DB_NAME || "faithly");
  await mongoose.connect(MONGO_CONN);
  const db = mongoose.connection.db;
  
  const goals = await db.collection('savings_goals').find({}).toArray();
  console.log("ALL SAVINGS GOALS:", JSON.stringify(goals, null, 2));
  
  process.exit(0);
}

run();
