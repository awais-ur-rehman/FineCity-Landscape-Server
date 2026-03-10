import mongoose, { Document, Schema } from 'mongoose';
import { CARE_TYPES } from '../utils/constants.js';

export interface ICareSchedule extends Document {
  branchId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  careType: string;
  frequencyDays: number;
  scheduledTime: string;
  assignedTo: mongoose.Types.ObjectId[];
  instructions?: string;
  startDate: Date;
  lastGeneratedDate?: Date;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const careScheduleSchema = new Schema<ICareSchedule>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'PlantBatch',
      required: true,
    },
    careType: {
      type: String,
      enum: CARE_TYPES,
      required: true,
    },
    frequencyDays: {
      type: Number,
      required: true,
      min: 1,
    },
    scheduledTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    instructions: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    lastGeneratedDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

careScheduleSchema.index({ branchId: 1, isActive: 1 });
careScheduleSchema.index({ batchId: 1, careType: 1 });
careScheduleSchema.index({ assignedTo: 1 });

careScheduleSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const CareSchedule = mongoose.model<ICareSchedule>('CareSchedule', careScheduleSchema);

export default CareSchedule;
