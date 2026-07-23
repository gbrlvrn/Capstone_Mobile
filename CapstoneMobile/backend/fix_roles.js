import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const fixRoles = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;

    if (!uri) throw new Error("MONGODB_URI is missing in .env");

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { dbName });
    console.log('Connected to:', dbName);

    const db = mongoose.connection;
    const usersCollection = db.collection('users');
    
    // Find users with an officer position but missing/incorrect role
    // Assuming 'Member' and '' (empty) are the non-officer positions.
    const result = await usersCollection.updateMany(
      { 
        position: { $nin: ['Member', 'member', ''] },
        $or: [
          { role: { $exists: false } },
          { role: 'member' },
          { role: 'user' }
        ]
      },
      { $set: { role: 'officer', verificationStatus: 'approved', isVerified: true } }
    );

    console.log(`Updated ${result.modifiedCount} users to officer role based on their position.`);

    // Also fix users created by the web app that should be members but have no role field
    const memberResult = await usersCollection.updateMany(
      { 
        position: { $in: ['Member', 'member', ''] },
        role: { $exists: false }
      },
      { $set: { role: 'member' } }
    );
    console.log(`Updated ${memberResult.modifiedCount} users to member role.`);

    process.exit(0);
  } catch (error) {
    console.error('Error fixing roles:', error);
    process.exit(1);
  }
};

fixRoles();
