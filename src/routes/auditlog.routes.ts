import { Router } from 'express';
import { getActivityLogs } from '../controllers/auditlog.controller';
import {
  authenticateToken,
  requireRole
} from '../middlewares/auth.middleware';

const router = Router();

router.get(
  '/activity-logs',
  authenticateToken,
  requireRole('admin'),
  getActivityLogs
);

export default router;