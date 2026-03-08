import mongoose from 'mongoose';
import { CARE_TYPES, TASK_STATUSES } from '../utils/constants.js';

/**
 * CareTask schema — individual task instances generated from CareSchedules.
 */
const careTaskSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CareSchedule',
      required: true,
    },
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
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'pending',
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: {
      type: Date,
    },
    skippedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    skipReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes as specified in CLAUDE.md
careTaskSchema.index({ scheduledAt: 1, status: 1 });
careTaskSchema.index({ batchId: 1, scheduledAt: -1 });
careTaskSchema.index({ assignedTo: 1, status: 1, scheduledAt: 1 });
// For task generator idempotency check
careTaskSchema.index({ scheduleId: 1, scheduledAt: 1 }, { unique: true });

careTaskSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const CareTask = mongoose.model('CareTask', careTaskSchema);

export default CareTask;
