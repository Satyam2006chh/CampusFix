const mongoose = require('mongoose');

const connectDB = async () => {
  // If USE_JSON_DB is true, run in testing mode with local db.json
  if (process.env.USE_JSON_DB === 'true' || !process.env.MONGO_URI) {
    console.log('⚡ Running Express Backend in Testing Mode (JSON DB: data/db.json)');
    console.log('ℹ️  MongoDB connection bypassed for testing purposes.');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️  MongoDB connection failed: ${error.message}`);
    console.log('⚡ Falling back to local JSON database for testing.');
    process.env.USE_JSON_DB = 'true';
  }
};

module.exports = connectDB;
