import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const resetData = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;

    if (!uri) throw new Error("MONGODB_URI is missing in .env");

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { dbName });
    console.log('Connected to:', dbName);

    const db = mongoose.connection;
    
    // Clear all transactional and history collections
    const collectionsToWipe = [
      'donations',
      'savings_transactions',
      'attendance',
      'loan_payments'
    ];

    for (const coll of collectionsToWipe) {
      console.log(`Clearing ${coll} collection...`);
      await db.collection(coll).deleteMany({});
    }
    
    // Reset balances/stats in other collections
    console.log('Resetting savings goals saved amounts to 0...');
    await db.collection('savings_goals').updateMany({}, { $set: { savedAmount: 0 } });

    console.log('Successfully reset all test data across the system.');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting data:', error);
    process.exit(1);
  }
};

resetData();
