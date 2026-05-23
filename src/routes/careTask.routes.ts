import { Router } from 'express';
import * as careTaskController from '../controllers/careTask.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { taskPhotoUpload } from '../middleware/upload.js';
import {
  completeTaskSchema,
  skipTaskSchema,
  listCareTaskQuerySchema,
  statsQuerySchema,
  fertilizerUsageHistorySchema,
} from '../validators/careTask.validator.js';
import { objectIdParamSchema } from '../validators/common.validator.js';

const router = Router();

/** All care task routes require authentication */
router.use(auth);

/** GET /care-tasks/stats — admin only (must be before /:id) */
router.get(
  '/stats',
  rbac('super_admin', 'branch_manager'),
  validate(statsQuerySchema, 'query'),
  careTaskController.getStats,
);

/** GET /care-tasks/fertilizer-usage — admin only */
router.get(
  '/fertilizer-usage',
  rbac('super_admin', 'branch_manager'),
  validate(fertilizerUsageHistorySchema, 'query'),
  careTaskController.getFertilizerUsageHistory,
);

/** GET /care-tasks/export — CSV export of tasks, admin only */
router.get(
  '/export',
  rbac('super_admin', 'branch_manager'),
  validate(statsQuerySchema, 'query'),
  careTaskController.exportTasksCsv,
);

/** GET /care-tasks — both roles (employee auto-filtered) */
router.get(
  '/',
  rbac('super_admin', 'branch_manager', 'employee'),
  validate(listCareTaskQuerySchema, 'query'),
  careTaskController.listTasks,
);

/** GET /care-tasks/:id — both roles */
router.get(
  '/:id',
  rbac('super_admin', 'branch_manager', 'employee'),
  validate(objectIdParamSchema, 'params'),
  careTaskController.getTask,
);

/** POST /care-tasks/:id/complete — both roles
 *  Accepts multipart/form-data (with optional photos) OR JSON.
 *  multer runs first so req.body is populated before Joi validation.
 */
router.post(
  '/:id/complete',
  rbac('super_admin', 'branch_manager', 'employee'),
  validate(objectIdParamSchema, 'params'),
  taskPhotoUpload,          // parses multipart; no-op for JSON requests
  validate(completeTaskSchema),
  careTaskController.completeTask,
);

/** POST /care-tasks/:id/skip — admin only */
router.post(
  '/:id/skip',
  rbac('super_admin', 'branch_manager'),
  validate(objectIdParamSchema, 'params'),
  validate(skipTaskSchema),
  careTaskController.skipTask,
);

export default router;
