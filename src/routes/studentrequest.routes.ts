import { Router } from 'express';
import {
  getAllStudentRequests,
  getStudentRequestById,
  getRequestStatistics,
  getStudentRequestsByStudentId,
  getStudentRequestTracking,
  cancelBatchRequest
} from '../controllers/studentrequest.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get(
  '/student-requests',
  authenticateToken,
  requireRole('admin', 'registrar'),
  getAllStudentRequests
);

router.get(
  '/student-requests/statistics',
  authenticateToken,
  requireRole('admin', 'registrar'),
  getRequestStatistics
);

router.get(
  '/student-requests/:requestId',
  authenticateToken,
  requireRole('admin', 'registrar'),
  getStudentRequestById
);


router.get(
  '/student-requests/student/:studentId',
  authenticateToken,
  requireRole('admin', 'registrar', 'student'),
  getStudentRequestsByStudentId
);

router.get(
  '/student-requests/:requestId/tracking',
  authenticateToken,
  requireRole('admin', 'registrar', 'student'),
  getStudentRequestTracking
);

router.post(
  '/student-requests/batch/:batchId/cancel',
  authenticateToken,
  requireRole('admin', 'registrar', 'student'),
  cancelBatchRequest
);

export default router;
