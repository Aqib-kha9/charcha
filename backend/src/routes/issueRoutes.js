import express from 'express';
import {
  analyzeImage,
  checkDuplicates,
  createIssue,
  getIssues,
  getIssueById,
  confirmIssue,
  supportIssue,
  shareIssue,
  updateStatus,
  assignIssue,
  resolveIssue,
  verifyResolution,
  getMyReports,
} from '../controllers/issueController.js';
import { protect, optionalAuth, authorize } from '../middleware/authMiddleware.js';
import { reportLimiter } from '../middleware/rateLimitMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * Issue Routes
 * ─────────────────────────────────────────────────────────
 * Public (optional auth): feed + detail
 * Auth required:         create, confirm, support, verify, my-reports
 * Authority required:    status update, assign, resolve
 */

// ── AI analysis + duplicate check (before creating) ──
router.post(
  '/analyze',
  protect,
  upload.single('image'),
  analyzeImage
);
router.post('/check-duplicates', protect, checkDuplicates);

// ── Create issue (with image upload + daily rate limit) ──
router.post(
  '/',
  protect,
  reportLimiter,
  upload.single('image'),
  createIssue
);

// ── Community feed (public, personalizes when logged in) ──
router.get('/', optionalAuth, getIssues);

// ── My reports (profile) ──
router.get('/my-reports', protect, getMyReports);

// ── Single issue detail ──
router.get('/:id', optionalAuth, getIssueById);

// ── Community actions: confirm + support + share ──
router.post('/:id/confirm', protect, confirmIssue);
router.post('/:id/support', protect, supportIssue);
router.post('/:id/share', protect, shareIssue);

// ── Citizen resolution verification ──
router.post('/:id/verify-resolution', protect, verifyResolution);

// ── Authority workflow: status, assign, resolve ──
router.patch(
  '/:id/status',
  protect,
  authorize('ward_officer', 'department_head', 'super_admin'),
  updateStatus
);
router.patch(
  '/:id/assign',
  protect,
  authorize('department_head', 'super_admin'),
  assignIssue
);
router.patch(
  '/:id/resolve',
  protect,
  authorize('ward_officer', 'department_head', 'super_admin'),
  upload.single('resolutionImage'),
  resolveIssue
);

export default router;
