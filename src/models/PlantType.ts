import mongoose, { Document, Schema } from 'mongoose';

export interface IPlantType extends Document {
  name: string;
  scientificName?: string;
  description?: string;
  careInstructions?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const plantTypeSchema = new Schema<IPlantType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    scientificName: { type: String, trim: true },
    description: { type: String },
    careInstructions: { type: String },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPlantType>('PlantType', plantTypeSchema);
