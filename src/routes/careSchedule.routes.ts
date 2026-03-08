import { Router } from 'express';
import * as careScheduleController from '../controllers/careSchedule.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createCareScheduleSchema,
  updateCareScheduleSchema,
  listCareScheduleQuerySchema,
} from '../validators/careSchedule.validator.js';

const router = Router();

/** All care schedule routes require auth + admin */
router.use(auth, rbac('super_admin', 'admin'));

/** GET /care-schedules */
router.get(
  '/',
  validate(listCareScheduleQuerySchema, 'query'),
  careScheduleController.listSchedules,
);

/** GET /care-schedules/:id */
router.get('/:id', careScheduleController.getSchedule);

/** POST /care-schedules */
router.post(
  '/',
  validate(createCareScheduleSchema),
  careScheduleController.createSchedule,
);

/** PUT /care-schedules/:id */
router.put(
  '/:id',
  validate(updateCareScheduleSchema),
  careScheduleController.updateSchedule,
);

/** DELETE /care-schedules/:id — deactivates + cancels future tasks */
router.delete('/:id', careScheduleController.deleteSchedule);

export default router;
