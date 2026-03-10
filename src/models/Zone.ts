import mongoose, { Document, Schema } from 'mongoose';

export interface IZone extends Document {
  name: string;
  code: string;
  branchId: mongoose.Types.ObjectId;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const zoneSchema = new Schema<IZone>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

zoneSchema.index({ branchId: 1, code: 1 }, { unique: true });

export default mongoose.model<IZone>('Zone', zoneSchema);
