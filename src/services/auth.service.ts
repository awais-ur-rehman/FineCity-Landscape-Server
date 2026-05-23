import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';
import ApiError from '../utils/apiError.js';
import env from '../config/env.js';

interface TokenPayload extends JwtPayload {
  userId: string;
}

const generateAccessToken = (user: IUser) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions,
  );
};

const generateRefreshToken = (user: IUser) => {
  return jwt.sign(
    { userId: user._id, jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
  );
};

/**
 * Authenticate with email + password.
 * Returns JWT pair and user profile on success.
 */
export const loginWithPassword = async (email: string, password: string) => {
  // Must explicitly select passwordHash since both fields are excluded by default
  const user = await User.findOne({ email })
    .select('+passwordHash +refreshToken')
    .populate('branches', '_id name code location isActive');

  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account deactivated. Contact your administrator.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: user.toJSON(),
  };
};

/**
 * Issue a new token pair using a valid refresh token (rotation).
 * Invalidates the old refresh token to prevent replay.
 */
export const rotateRefreshToken = async (token: string) => {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.userId).select('+refreshToken');

  // Verify token against stored hash — detects reuse if hash doesn't match
  const isValid = user?.refreshToken
    ? await bcrypt.compare(token, user.refreshToken)
    : false;

  if (!user || !isValid) {
    // Token reuse detected — invalidate all sessions for this user
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    throw ApiError.unauthorized('Invalid refresh token. Please log in again.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account deactivated');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { accessToken, refreshToken };
};

/**
 * Clear refresh token on logout.
 */
export const logoutUser = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
};

/**
 * Hash and store a new password for a user.
 * Used by admin when creating/resetting employee passwords.
 */
export const setPassword = async (userId: string, plainPassword: string) => {
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  await User.findByIdAndUpdate(userId, { passwordHash });
};

/**
 * Allow an authenticated user to change their own password.
 */
export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await User.findById(userId).select('+passwordHash +refreshToken');

  if (!user || !user.passwordHash) {
    throw ApiError.badRequest('No password set. Contact your administrator.');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  // Invalidate all active sessions so other devices re-authenticate
  user.refreshToken = undefined;
  await user.save();
};

/**
 * Register an FCM token for push notifications.
 * Deduplicates and caps stored tokens at 5 per user.
 */
export const registerFcmToken = async (userId: string, fcmToken: string, platform: 'android' | 'ios') => {
  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Remove duplicate token if already registered
  user.fcmTokens = user.fcmTokens.filter((t) => t.token !== fcmToken);

  // Enforce max 5 tokens (drop oldest when over limit)
  if (user.fcmTokens.length >= 5) {
    user.fcmTokens = user.fcmTokens.slice(-4);
  }

  user.fcmTokens.push({
    token: fcmToken,
    platform,
    updatedAt: new Date(),
  });

  await user.save();
};
