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
import { objectIdParamSchema } from '../validators/common.validator.js';
import { singleImageUpload } from '../middleware/upload.js';

const router = Router();

/** All plant batch routes require authentication */
router.use(auth);

/** GET /plant-batches — admin + employee can read */
router.get(
  '/',
  rbac('super_admin', 'admin', 'employee'),
  validate(listPlantBatchQuerySchema, 'query'),
  plantBatchController.listBatches,
);

/** GET /plant-batches/export — CSV export, admin only (must be before /:id) */
router.get(
  '/export',
  rbac('super_admin', 'admin'),
  plantBatchController.exportBatches,
);

/** POST /plant-batches/upload-image — upload batch image to Cloudinary */
router.post(
  '/upload-image',
  rbac('super_admin', 'admin'),
  singleImageUpload,
  plantBatchController.uploadBatchImage,
);

/** DELETE /plant-batches/delete-image — delete batch image from Cloudinary */
router.delete(
  '/delete-image',
  rbac('super_admin', 'admin'),
  plantBatchController.deleteBatchImage,
);

/** GET /plant-batches/:id — admin + employee can read */
router.get(
  '/:id',
  rbac('super_admin', 'admin', 'employee'),
  validate(objectIdParamSchema, 'params'),
  plantBatchController.getBatch,
);

/** POST /plant-batches — admin only */
router.post(
  '/',
  rbac('super_admin', 'admin'),
  validate(createPlantBatchSchema),
  plantBatchController.createBatch,
);

/** PUT /plant-batches/:id — admin only */
router.put(
  '/:id',
  rbac('super_admin', 'admin'),
  validate(objectIdParamSchema, 'params'),
  validate(updatePlantBatchSchema),
  plantBatchController.updateBatch,
);

/** DELETE /plant-batches/:id — admin only (soft delete) */
router.delete(
  '/:id',
  rbac('super_admin', 'admin'),
  validate(objectIdParamSchema, 'params'),
  plantBatchController.deleteBatch,
);

export default router;
