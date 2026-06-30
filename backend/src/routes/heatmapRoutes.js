import express from 'express';
import { getHeatmap, recomputeHeatmap } from '../controllers/heatmapController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Heatmap Routes (doc §5.2.7)
 *  GET  /api/heatmap           - Get all zones (public)
 *  POST /api/heatmap/recompute - Recompute from issue data (super_admin)
 */
router.get('/', getHeatmap);
router.post('/recompute', protect, authorize('super_admin'), recomputeHeatmap);

export default router;
