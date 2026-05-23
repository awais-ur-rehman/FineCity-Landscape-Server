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
  role: 'super_admin' | 'branch_manager' | 'employee';
  passwordHash?: string;
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
    passwordHash: {
      type: String,
      select: false, // never returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: ['super_admin', 'branch_manager', 'employee'],
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
      select: false,
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
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
