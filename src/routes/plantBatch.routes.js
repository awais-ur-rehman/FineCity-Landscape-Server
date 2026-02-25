import { Router } from 'express';
import * as plantBatchController from '../controllers/plantBatch.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createPlantBatchSchema,
  updatePlantBatchSchema,
  listPlantBatchQuerySchema,
} from '../validators/plantBatch.validator.js';

const router = Router();

/** All plant batch routes require authentication */
router.use(auth);

/** GET /plant-batches — admin + employee can read */
router.get(
  '/',
  rbac('admin', 'employee'),
  validate(listPlantBatchQuerySchema, 'query'),
  plantBatchController.listBatches,
);

/** GET /plant-batches/:id — admin + employee can read */
router.get('/:id', rbac('admin', 'employee'), plantBatchController.getBatch);

/** POST /plant-batches — admin only */
router.post(
  '/',
  rbac('admin'),
  validate(createPlantBatchSchema),
  plantBatchController.createBatch,
);

/** PUT /plant-batches/:id — admin only */
router.put(
  '/:id',
  rbac('admin'),
  validate(updatePlantBatchSchema),
  plantBatchController.updateBatch,
);

/** DELETE /plant-batches/:id — admin only (soft delete) */
router.delete('/:id', rbac('admin'), plantBatchController.deleteBatch);

export default router;
