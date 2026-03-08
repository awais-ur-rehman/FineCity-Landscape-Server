import mongoose, { Schema } from 'mongoose';
const plantTypeSchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    scientificName: { type: String, trim: true },
    description: { type: String },
    careInstructions: { type: String },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('PlantType', plantTypeSchema);
