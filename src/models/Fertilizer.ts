import mongoose, { Schema, Document } from 'mongoose';

export interface IFertilizer extends Document {
  name: string;
  brand?: string;
  type: 'organic' | 'chemical' | 'bio';
  npkRatio?: string;
  description?: string;
  defaultDosage?: number;
  defaultUnit?: 'ml' | 'g' | 'kg' | 'L';
  isActive: boolean;
  branchId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fertilizerSchema = new Schema<IFertilizer>(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    type: { type: String, enum: ['organic', 'chemical', 'bio'], default: 'chemical' },
    npkRatio: { type: String, trim: true },
    description: { type: String, trim: true },
    defaultDosage: { type: Number, min: 0 },
    defaultUnit: { type: String, enum: ['ml', 'g', 'kg', 'L'] },
    isActive: { type: Boolean, default: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Indexes
fertilizerSchema.index({ branchId: 1, isActive: 1 });
fertilizerSchema.index({ name: 'text' });

export default mongoose.model<IFertilizer>('Fertilizer', fertilizerSchema);
