import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import config from '../config/index.js';
import logger from '../utils/logger.js';

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

/**
 * Uploads an image buffer to Cloudinary and returns the secure URL.
 * @param {Buffer} buffer - The image buffer to upload
 * @param {string} folder - The Cloudinary folder to upload to
 * @returns {Promise<string>} The secure URL of the uploaded image
 */
export const uploadImage = (buffer, folder = 'charcha_issues') => {
  return new Promise((resolve, reject) => {
    if (!config.cloudinaryCloudName) {
      logger.warn('Cloudinary not configured, returning dummy URL.');
      return resolve('https://via.placeholder.com/600x400?text=Cloudinary+Not+Configured');
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          logger.error(`Cloudinary upload failed: ${error.message}`);
          reject(error);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};
