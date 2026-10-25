const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`⚠️ MongoDB Atlas connection failed: ${error.message}`);

    // If Atlas failed (usually IP whitelist), try local MongoDB so dev server doesn't crash
    const localUri = 'mongodb://localhost:27017/campusfix';
    if (process.env.MONGO_URI !== localUri) {
      console.log('🔄 Attempting fallback to local MongoDB (localhost:27017)...');
      try {
        const localConn = await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
        console.log(`✅ Fallback Connected to local MongoDB: ${localConn.connection.host}`);
        console.log('💡 Note: To use Atlas, add 0.0.0.0/0 in MongoDB Atlas > Network Access > IP Access List.');
        return;
      } catch (localErr) {
        console.error(`❌ Local MongoDB also unreachable: ${localErr.message}`);
      }
    }

    console.error('❌ Could not establish MongoDB connection.');
    process.exit(1);
  }
};

module.exports = connectDB;
