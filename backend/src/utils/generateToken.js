import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Generates a JWT token for an authenticated user.
 * @param {string} userId - The user's MongoDB ObjectId
 * @param {string} role - The user's role ('citizen' | 'authority')
 * @returns {string} Signed JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

export default generateToken;
