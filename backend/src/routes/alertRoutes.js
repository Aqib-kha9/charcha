import express from 'express';
import { getAlerts, createAlert } from '../controllers/alertController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Civic Alert Routes (doc §5.2.3)
 *  GET  /api/alerts  - List alerts (public)
 *  POST /api/alerts  - Create alert (authority)
 */
router.get('/', getAlerts);
router.post(
  '/',
  protect,
  authorize('ward_officer', 'department_head', 'super_admin'),
  createAlert
);

export default router;
