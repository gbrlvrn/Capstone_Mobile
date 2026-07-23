import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from './models/Attendance.js';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function clean() {
  try {
    const MONGO_CONN = (process.env.MONGODB_URI || "mongodb://localhost:27017/") + (process.env.DB_NAME || "faithly");
    await mongoose.connect(MONGO_CONN);
    console.log('Connected to DB');
    
    // Find all attendance records
    const records = await Attendance.find().sort({ createdAt: 1 });
    console.log(`Found ${records.length} total attendance records`);
    
    const seen = new Set();
    let deletedCount = 0;
    
    for (const record of records) {
      let key;
      if (record.sessionId) {
        key = `${record.email}-${record.sessionId}`;
      } else {
        // Manual checkin per day
        const d = new Date(record.createdAt);
        key = `${record.email}-manual-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }
      
      if (seen.has(key)) {
        await Attendance.deleteOne({ _id: record._id });
        deletedCount++;
        console.log(`Deleted duplicate: ${key}`);
      } else {
        seen.add(key);
      }
    }
    
    console.log(`Finished. Deleted ${deletedCount} duplicate records.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

clean();
