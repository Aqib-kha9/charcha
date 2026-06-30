import express from 'express';
import {
  getDashboard,
  getDepartmentPerformance,
  getPriorityQueue,
} from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Analytics Routes (doc §5.1.9 — Authority Dashboard)
 *  GET /api/analytics/dashboard              - Authority dashboard stats
 *  GET /api/analytics/departments            - Department performance
 *  GET /api/analytics/priority-queue         - AI Priority Queue
 */
router.get(
  '/dashboard',
  protect,
  authorize('ward_officer', 'department_head', 'super_admin'),
  getDashboard
);
router.get(
  '/departments',
  protect,
  authorize('department_head', 'super_admin'),
  getDepartmentPerformance
);
router.get(
  '/priority-queue',
  protect,
  authorize('ward_officer', 'department_head', 'super_admin'),
  getPriorityQueue
);

export default router;
