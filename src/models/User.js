import mongoose from 'mongoose';

/**
 * @typedef {Object} FcmToken
 * @property {string} token - FCM registration token
 * @property {string} platform - 'android' or 'ios'
 * @property {Date} updatedAt
 */

/**
 * User schema for admin and employee roles.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'employee'],
      default: 'employee',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    fcmTokens: [
      {
        token: { type: String, required: true },
        platform: { type: String, enum: ['android', 'ios'], required: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    refreshToken: {
      type: String,
    },
    lastSyncAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ role: 1, isActive: 1 });

/**
 * Remove sensitive fields when converting to JSON.
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
