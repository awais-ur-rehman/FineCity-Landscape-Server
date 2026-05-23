import Joi from 'joi';
/** Login with email + password */
export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least 8 characters',
        'any.required': 'Password is required',
    }),
});
/** Validate refresh token */
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'any.required': 'Refresh token is required',
    }),
});
/** Change own password */
export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required',
    }),
    newPassword: Joi.string().min(8).required().messages({
        'string.min': 'New password must be at least 8 characters',
        'any.required': 'New password is required',
    }),
});
/** Validate FCM token registration */
export const fcmTokenSchema = Joi.object({
    fcmToken: Joi.string().required().messages({
        'any.required': 'FCM token is required',
    }),
    platform: Joi.string().valid('android', 'ios').required().messages({
        'any.only': 'Platform must be android or ios',
        'any.required': 'Platform is required',
    }),
});
