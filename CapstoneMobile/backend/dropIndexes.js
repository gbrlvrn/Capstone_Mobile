import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { users } from './config/db.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/faithly';

async function dropInvalidIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const usersCollection = users;

    console.log('\n📋 Current indexes:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    // Drop the incorrect unique indexes
    const indexesToDrop = [
      'community_1',
      'position_1',
      'gender_1',
      'dob_1',
      'password_1'
    ];

    console.log('\n🗑️  Dropping incorrect indexes...');
    for (const indexName of indexesToDrop) {
      try {
        await usersCollection.dropIndex(indexName);
        console.log(`  ✅ Dropped: ${indexName}`);
      } catch (err) {
        if (err.code === 27) {
          console.log(`  ⚠️  ${indexName} does not exist (already dropped)`);
        } else {
          console.log(`  ❌ Error dropping ${indexName}:`, err.message);
        }
      }
    }

    console.log('\n📋 Remaining indexes:');
    const remainingIndexes = await usersCollection.indexes();
    remainingIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    console.log('\n✅ Done! Your database is now fixed.');
    console.log('You should only have these indexes:');
    console.log('  - _id_ (default)');
    console.log('  - email_1 (unique)');
    console.log('  - phone_1 (unique)');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropInvalidIndexes();