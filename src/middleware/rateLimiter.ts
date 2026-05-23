import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_GENERAL, RATE_LIMIT_OTP } from '../utils/constants.js';

/**
 * General rate limiter: 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_GENERAL.windowMs,
  limit: RATE_LIMIT_GENERAL.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Login rate limiter: 3 requests per 15 minutes per IP.
 */
export const otpLimiter = rateLimit({
  windowMs: RATE_LIMIT_OTP.windowMs,
  limit: RATE_LIMIT_OTP.max,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
