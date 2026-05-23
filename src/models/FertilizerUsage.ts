import mongoose, { Document, Schema } from 'mongoose';

export interface IFertilizerUsageItem {
  fertilizerId: mongoose.Types.ObjectId;
  quantity: number;
  unit: 'ml' | 'g' | 'kg' | 'L';
}

export interface IFertilizerUsage extends Document {
  taskId: mongoose.Types.ObjectId;
  scheduleId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  completedBy: mongoose.Types.ObjectId;
  usages: IFertilizerUsageItem[];
  notes?: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fertilizerUsageItemSchema = new Schema<IFertilizerUsageItem>(
  {
    fertilizerId: { type: Schema.Types.ObjectId, ref: 'Fertilizer', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['ml', 'g', 'kg', 'L'], required: true },
  },
  { _id: false },
);

const fertilizerUsageSchema = new Schema<IFertilizerUsage>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'CareTask', required: true, unique: true },
    scheduleId: { type: Schema.Types.ObjectId, ref: 'CareSchedule', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'PlantBatch', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    usages: { type: [fertilizerUsageItemSchema], default: [] },
    notes: { type: String, trim: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

fertilizerUsageSchema.index({ batchId: 1, recordedAt: -1 });
fertilizerUsageSchema.index({ scheduleId: 1, recordedAt: -1 });
fertilizerUsageSchema.index({ branchId: 1, recordedAt: -1 });
fertilizerUsageSchema.index({ completedBy: 1, recordedAt: -1 });
fertilizerUsageSchema.index({ 'usages.fertilizerId': 1 });

export default mongoose.model<IFertilizerUsage>('FertilizerUsage', fertilizerUsageSchema);
