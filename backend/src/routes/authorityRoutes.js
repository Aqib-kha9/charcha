import express from 'express';
import {
  getAuthorities,
  createAuthority,
  handoverIssues,
  updateAuthority,
} from '../controllers/authorityController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Authority Management Routes (doc §5.1.11)
 *  GET  /api/authorities           - List authorities
 *  POST /api/authorities           - Create authority (super_admin)
 *  POST /api/authorities/handover  - Handover issues (super_admin)
 *  PUT  /api/authorities/:id       - Update authority (super_admin)
 */
router.get(
  '/',
  protect,
  authorize('department_head', 'super_admin'),
  getAuthorities
);
router.post(
  '/',
  protect,
  authorize('super_admin'),
  createAuthority
);
router.post(
  '/handover',
  protect,
  authorize('super_admin'),
  handoverIssues
);
router.put(
  '/:id',
  protect,
  authorize('super_admin'),
  updateAuthority
);

export default router;
