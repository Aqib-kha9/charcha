import express from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  getDepartmentIssues,
} from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Department Routes (doc §5.1.8)
 * ─────────────────────────────────────────────────────────
 *  GET    /api/departments          - List all departments (public)
 *  GET    /api/departments/:id      - Single department
 *  POST   /api/departments          - Create (super_admin)
 *  GET    /api/departments/:id/issues - Issues for a department
 */
router.get('/', getDepartments);
router.get('/:id', getDepartmentById);
router.get('/:id/issues', getDepartmentIssues);
router.post('/', protect, authorize('super_admin'), createDepartment);

export default router;
