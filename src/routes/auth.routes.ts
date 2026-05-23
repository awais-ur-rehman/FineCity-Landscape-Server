import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import auth from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { otpLimiter } from '../middleware/rateLimiter.js';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  fcmTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

/** POST /auth/login — email + password */
router.post('/login', otpLimiter, validate(loginSchema), authController.login);

/** POST /auth/refresh-token */
router.post('/refresh-token', otpLimiter, validate(refreshTokenSchema), authController.refreshToken);

/** POST /auth/logout */
router.post('/logout', auth, authController.logout);

/** PUT /auth/change-password */
router.put('/change-password', auth, validate(changePasswordSchema), authController.changePassword);

/** POST /auth/fcm-token */
router.post('/fcm-token', auth, validate(fcmTokenSchema), authController.registerFcmToken);

export default router;
