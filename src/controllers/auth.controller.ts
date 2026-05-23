import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import AuditLog from '../models/AuditLog.js';
import apiResponse from '../utils/apiResponse.js';

/**
 * POST /auth/login
 * Authenticate with email + password, return JWT pair.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const data = await authService.loginWithPassword(email, password);
    AuditLog.create({
      action: 'LOGIN',
      entity: 'User',
      entityId: data.user._id?.toString() ?? '',
      performedBy: data.user._id,
      details: { email, role: data.user.role },
    }).catch(() => {});
    return apiResponse(res, 200, 'Login successful', data);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/refresh-token
 * Issue new token pair using a valid refresh token.
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
 * Clear refresh token — invalidate session.
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
 * PUT /auth/change-password
 * Authenticated user changes their own password.
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!._id.toString(), currentPassword, newPassword);
    return apiResponse(res, 200, 'Password changed successfully');
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
