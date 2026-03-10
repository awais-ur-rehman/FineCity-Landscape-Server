import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { createUserSchema, updateUserSchema, switchBranchSchema } from '../validators/user.validator.js';

const router = Router();

router.use(auth);

/** User profile routes */
router.get('/me', userController.getMe);
router.put('/me/branch', validate(switchBranchSchema), userController.switchBranch);

/** Admin-only routes */
router.use(rbac('super_admin', 'admin'));

/** GET /users */
router.get('/', userController.listUsers);

/** POST /users */
router.post('/', validate(createUserSchema), userController.createUser);

/** PUT /users/:id */
router.put('/:id', validate(updateUserSchema), userController.updateUser);

/** DELETE /users/:id */
router.delete('/:id', userController.deleteUser);

export default router;
