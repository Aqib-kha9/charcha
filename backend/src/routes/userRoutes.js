import express from 'express';
import {
  getUserProfile,
  getUserImpactScore,
  getLeaderboard,
  getAuthorities,
} from '../controllers/userController.js';

const router = express.Router();

/**
 * User routes — public reputation & community data.
 * Authenticated "me" endpoints live under /api/auth.
 */
router.get('/leaderboard', getLeaderboard);
router.get('/authorities', getAuthorities);
router.get('/:id', getUserProfile);
router.get('/:id/impact-score', getUserImpactScore);

export default router;
