import mongoose, { Schema } from 'mongoose';
const branchSchema = new Schema({
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, unique: true, uppercase: true },
    location: { type: String, required: true },
    contactPerson: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Branch', branchSchema);
