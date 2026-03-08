import mongoose, { Schema } from 'mongoose';
const careTypeSchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String },
    defaultFrequency: { type: Number }, // in days
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('CareType', careTypeSchema);
