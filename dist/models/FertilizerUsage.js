import mongoose, { Schema } from 'mongoose';
const fertilizerUsageItemSchema = new Schema({
    fertilizerId: { type: Schema.Types.ObjectId, ref: 'Fertilizer', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['ml', 'g', 'kg', 'L'], required: true },
}, { _id: false });
const fertilizerUsageSchema = new Schema({
    taskId: { type: Schema.Types.ObjectId, ref: 'CareTask', required: true, unique: true },
    scheduleId: { type: Schema.Types.ObjectId, ref: 'CareSchedule', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'PlantBatch', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    usages: { type: [fertilizerUsageItemSchema], default: [] },
    notes: { type: String, trim: true },
    recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });
fertilizerUsageSchema.index({ batchId: 1, recordedAt: -1 });
fertilizerUsageSchema.index({ scheduleId: 1, recordedAt: -1 });
fertilizerUsageSchema.index({ branchId: 1, recordedAt: -1 });
fertilizerUsageSchema.index({ completedBy: 1, recordedAt: -1 });
fertilizerUsageSchema.index({ 'usages.fertilizerId': 1 });
export default mongoose.model('FertilizerUsage', fertilizerUsageSchema);
