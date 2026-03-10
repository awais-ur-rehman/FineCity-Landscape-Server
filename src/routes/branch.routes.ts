import { Router } from 'express';
import * as branchController from '../controllers/branch.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { createBranchSchema, updateBranchSchema } from '../validators/resource.validator.js';

const router = Router();

router.use(auth);

router.get('/', branchController.listBranches);
router.get('/:id', branchController.getBranch);

router.post('/', rbac('super_admin'), validate(createBranchSchema), branchController.createBranch);
router.put('/:id', rbac('super_admin'), validate(updateBranchSchema), branchController.updateBranch);
router.delete('/:id', rbac('super_admin'), branchController.deleteBranch);

export default router;
