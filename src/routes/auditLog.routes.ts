import { Router } from 'express';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import { listAuditLogs } from '../controllers/auditLog.controller.js';

const router = Router();

/** GET /audit-logs — admin + super_admin only */
router.get('/', auth, rbac('branch_manager', 'super_admin'), listAuditLogs);

export default router;
