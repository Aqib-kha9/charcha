import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

/**
 * Auth Routes (doc §5.1.1)
 * ─────────────────────────────────────────────────────────
 *  POST   /api/auth/register  - Register a new user (citizen/authority)
 *  POST   /api/auth/login      - Login user
 *  GET    /api/auth/me         - Get current logged-in user
 *  PUT    /api/auth/me         - Update current user profile
 */
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);

export default router;
