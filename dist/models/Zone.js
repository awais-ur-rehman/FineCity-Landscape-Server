import mongoose, { Schema } from 'mongoose';
const zoneSchema = new Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
zoneSchema.index({ branchId: 1, code: 1 }, { unique: true });
export default mongoose.model('Zone', zoneSchema);
