import mongoose, { Document, Schema } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otp: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

otpSchema.index({ email: 1 });

const Otp = mongoose.model<IOtp>('Otp', otpSchema);

export default Otp;
