import Joi from 'joi';

/** Validate email for OTP send */
export const sendOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

/** Validate email + 6-digit OTP */
export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'OTP must be a 6-digit number',
      'any.required': 'OTP is required',
    }),
});

/** Validate refresh token */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
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
