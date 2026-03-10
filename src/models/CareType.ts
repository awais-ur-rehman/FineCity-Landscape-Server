import mongoose, { Document, Schema } from 'mongoose';

export interface ICareType extends Document {
  name: string;
  slug: string;
  description?: string;
  defaultFrequency?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const careTypeSchema = new Schema<ICareType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String },
    defaultFrequency: { type: Number }, // in days
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICareType>('CareType', careTypeSchema);
