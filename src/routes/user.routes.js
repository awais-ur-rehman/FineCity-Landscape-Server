import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import auth from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';

const router = Router();

/** All user routes require auth + admin role */
router.use(auth, rbac('admin'));

/** GET /users */
router.get('/', userController.listUsers);

/** POST /users */
router.post('/', validate(createUserSchema), userController.createUser);

/** PUT /users/:id */
router.put('/:id', validate(updateUserSchema), userController.updateUser);

/** DELETE /users/:id */
router.delete('/:id', userController.deleteUser);

export default router;
