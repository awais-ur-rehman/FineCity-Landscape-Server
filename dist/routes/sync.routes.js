import { Router } from 'express';
import * as syncController from '../controllers/sync.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { syncSchema } from '../validators/sync.validator.js';
const router = Router();
/** POST /sync — auth + both roles */
router.post('/', auth, rbac('admin', 'employee'), validate(syncSchema), syncController.sync);
export default router;
