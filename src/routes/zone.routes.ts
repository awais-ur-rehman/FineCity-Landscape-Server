import { Router } from 'express';
import * as zoneController from '../controllers/zone.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { createZoneSchema, updateZoneSchema, listZoneQuerySchema } from '../validators/resource.validator.js';

const router = Router();

router.use(auth);

router.get('/', validate(listZoneQuerySchema, 'query'), zoneController.listZones);
router.get('/:id', zoneController.getZone);

// Admins can manage zones within their own branch(es); super_admin can manage all
router.post('/', rbac('super_admin', 'branch_manager'), validate(createZoneSchema), zoneController.createZone);
router.put('/:id', rbac('super_admin', 'branch_manager'), validate(updateZoneSchema), zoneController.updateZone);
router.delete('/:id', rbac('super_admin', 'branch_manager'), zoneController.deleteZone);

export default router;
