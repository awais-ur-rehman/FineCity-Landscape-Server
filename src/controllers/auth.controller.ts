import { Request, Response, NextFunction } from 'express';
import * as otpService from '../services/otp.service.js';
import * as authService from '../services/auth.service.js';
import apiResponse from '../utils/apiResponse.js';

/**
 * POST /auth/send-otp
 * Send OTP to the given email.
 */
export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    await otpService.sendOtp(email);
    return apiResponse(res, 200, 'OTP sent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/verify-otp
 * Verify OTP and return JWT pair.
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    await otpService.verifyOtp(email, otp);
    const data = await authService.authenticateUser(email);
    return apiResponse(res, 200, 'OTP verified successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/refresh-token
 * Issue new token pair using refresh token.
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;
    const data = await authService.rotateRefreshToken(token);
    return apiResponse(res, 200, 'Token refreshed successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/logout
 * Clear refresh token.
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      await authService.logoutUser(req.user._id.toString());
    }
    return apiResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/fcm-token
 * Register FCM token for push notifications.
 */
export const registerFcmToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fcmToken, platform } = req.body;
    if (req.user) {
      await authService.registerFcmToken(req.user._id.toString(), fcmToken, platform);
    }
    return apiResponse(res, 200, 'FCM token registered successfully');
  } catch (error) {
    next(error);
  }
};
