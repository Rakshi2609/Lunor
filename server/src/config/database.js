import mongoose from 'mongoose';
import User from '../models/User.js';

const fixLegacyIndexes = async () => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    if (collections.some(c => c.name === 'users')) {
      const usersCollection = mongoose.connection.db.collection('users');
      const indexes = await usersCollection.indexes();
      
      for (const index of indexes) {
        if (index.name === 'firebaseUid_1' || (index.key && index.key.firebaseUid)) {
          console.log(`🔧 Dropping legacy index [${index.name}] from users collection to allow new user sign-ins...`);
          try {
            await usersCollection.dropIndex(index.name);
            console.log(`✅ Dropped legacy index: ${index.name}`);
          } catch (dropErr) {
            console.warn(`⚠️ Could not drop ${index.name}:`, dropErr.message);
          }
        }
      }

      await User.syncIndexes();
    }
  } catch (err) {
    console.warn('⚠️ Index migration notice:', err.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
    await fixLegacyIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
