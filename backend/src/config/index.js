import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Centralized application configuration.
 * All environment variables are read here and validated.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/charcha',

  // AI Layer (Gemini)
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',

  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Cloudinary
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

  // CORS
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',

  // Business Logic
  duplicateRadiusMeters: parseInt(process.env.DUPLICATE_RADIUS_METERS || '50', 10),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
};

export default config;
