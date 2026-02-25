import mongoose from 'mongoose';
import { CARE_TYPES } from '../utils/constants.js';

/**
 * CareSchedule schema — defines recurring care routines for a plant batch.
 */
const careScheduleSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

careScheduleSchema.index({ batchId: 1, careType: 1 });
careScheduleSchema.index({ isActive: 1 });
careScheduleSchema.index({ assignedTo: 1 });

careScheduleSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const CareSchedule = mongoose.model('CareSchedule', careScheduleSchema);

export default CareSchedule;
