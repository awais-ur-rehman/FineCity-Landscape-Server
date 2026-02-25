import mongoose from 'mongoose';
import { PLANT_CATEGORIES } from '../utils/constants.js';

/**
 * PlantBatch schema — represents a group of plants in a specific zone/location.
 */
const plantBatchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    plantType: {
      type: String,
      required: true,
      trim: true,
    },
    scientificName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: PLANT_CATEGORIES,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    zone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

plantBatchSchema.index({ name: 'text', plantType: 'text' });
plantBatchSchema.index({ zone: 1, status: 1 });
plantBatchSchema.index({ category: 1, status: 1 });
plantBatchSchema.index({ isDeleted: 1, status: 1 });

/**
 * Remove __v from JSON output.
 */
plantBatchSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const PlantBatch = mongoose.model('PlantBatch', plantBatchSchema);

export default PlantBatch;
