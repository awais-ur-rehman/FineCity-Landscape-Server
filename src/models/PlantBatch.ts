import mongoose, { Document, Schema } from 'mongoose';

export interface IPlantBatch extends Document {
  branchId: mongoose.Types.ObjectId;
  name: string;
  plantType: mongoose.Types.ObjectId;
  scientificName?: string;
  category: mongoose.Types.ObjectId;
  quantity?: number;
  zone: mongoose.Types.ObjectId;
  location?: string;
  imageUrl?: string;
  imagePublicId?: string;
  notes?: string;
  details?: Map<string, any>;
  displayName?: string;
  status: 'active' | 'archived';
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const plantBatchSchema = new Schema<IPlantBatch>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    plantType: {
      type: Schema.Types.ObjectId,
      ref: 'PlantType',
      required: true,
    },
    scientificName: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    zone: {
      type: Schema.Types.ObjectId,
      ref: 'Zone',
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    details: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    displayName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
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

plantBatchSchema.index({ branchId: 1, status: 1 });
plantBatchSchema.index({ branchId: 1, zone: 1 });
plantBatchSchema.index({ branchId: 1, category: 1 });
plantBatchSchema.index({ name: 'text', scientificName: 'text' });

plantBatchSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const PlantBatch = mongoose.model<IPlantBatch>('PlantBatch', plantBatchSchema);

export default PlantBatch;
