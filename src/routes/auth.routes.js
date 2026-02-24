import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import auth from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { otpLimiter } from '../middleware/rateLimiter.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  fcmTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

/** POST /auth/send-otp */
router.post('/send-otp', otpLimiter, validate(sendOtpSchema), authController.sendOtp);

/** POST /auth/verify-otp */
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

/** POST /auth/refresh-token */
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

/** POST /auth/logout */
router.post('/logout', auth, authController.logout);

/** POST /auth/fcm-token */
router.post('/fcm-token', auth, validate(fcmTokenSchema), authController.registerFcmToken);

export default router;
