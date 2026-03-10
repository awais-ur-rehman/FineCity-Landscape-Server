import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import env from '../config/env.js';
const generateAccessToken = (user) => {
    return jwt.sign({ userId: user._id, email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
};
const generateRefreshToken = (user) => {
    return jwt.sign({ userId: user._id, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
};
export const authenticateUser = async (email) => {
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({
            email,
            name: email.split('@')[0],
            role: 'employee',
        });
    }
    if (!user.isActive) {
        throw ApiError.forbidden('Account deactivated. Contact your administrator.');
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();
    return {
        accessToken,
        refreshToken,
        user: user.toJSON(),
    };
};
export const rotateRefreshToken = async (token) => {
    let payload;
    try {
        payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
    }
    catch {
        throw ApiError.unauthorized('Invalid or expired refresh token');
    }
    const user = await User.findById(payload.userId);
    if (!user || user.refreshToken !== token) {
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
    user.refreshToken = refreshToken;
    await user.save();
    return { accessToken, refreshToken };
};
export const logoutUser = async (userId) => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
};
export const registerFcmToken = async (userId, fcmToken, platform) => {
    const user = await User.findById(userId);
    if (!user) {
        throw ApiError.notFound('User not found');
    }
    user.fcmTokens = user.fcmTokens.filter((t) => t.token !== fcmToken);
    user.fcmTokens.push({
        token: fcmToken,
        platform,
        updatedAt: new Date(),
    });
    await user.save();
};
