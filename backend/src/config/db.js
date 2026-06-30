import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

/**
 * Establishes a connection to MongoDB Atlas.
 * Uses Mongoose with recommended settings.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      // Mongoose 8 uses sensible defaults; these are explicit for clarity
      serverSelectionTimeoutMS: 10000,
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Exit process with failure on DB connection error
    process.exit(1);
  }
};

export default connectDB;
