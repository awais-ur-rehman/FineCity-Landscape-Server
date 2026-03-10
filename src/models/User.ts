import mongoose, { Document, Schema } from 'mongoose';

export interface IFcmToken {
  token: string;
  platform: 'android' | 'ios';
  updatedAt: Date;
}

export interface IUser extends Document {
  email: string;
  name: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'employee';
  isActive: boolean;
  branches: mongoose.Types.ObjectId[];
  currentBranch?: mongoose.Types.ObjectId;
  fcmTokens: IFcmToken[];
  refreshToken?: string | null;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
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
      enum: ['super_admin', 'admin', 'employee'],
      default: 'employee',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    branches: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
      },
    ],
    currentBranch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
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
userSchema.index({ branches: 1 });

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
