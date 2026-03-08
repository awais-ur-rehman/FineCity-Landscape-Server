import { Router } from 'express';
import * as careTaskController from '../controllers/careTask.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { completeTaskSchema, skipTaskSchema, listCareTaskQuerySchema, statsQuerySchema, } from '../validators/careTask.validator.js';
const router = Router();
/** All care task routes require authentication */
router.use(auth);
/** GET /care-tasks/stats — admin only (must be before /:id) */
router.get('/stats', rbac('admin'), validate(statsQuerySchema, 'query'), careTaskController.getStats);
/** GET /care-tasks — both roles (employee auto-filtered) */
router.get('/', rbac('admin', 'employee'), validate(listCareTaskQuerySchema, 'query'), careTaskController.listTasks);
/** GET /care-tasks/:id — both roles */
router.get('/:id', rbac('admin', 'employee'), careTaskController.getTask);
/** POST /care-tasks/:id/complete — both roles */
router.post('/:id/complete', rbac('admin', 'employee'), validate(completeTaskSchema), careTaskController.completeTask);
/** POST /care-tasks/:id/skip — admin only */
router.post('/:id/skip', rbac('admin'), validate(skipTaskSchema), careTaskController.skipTask);
export default router;
