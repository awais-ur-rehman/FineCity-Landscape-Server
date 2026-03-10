import mongoose, { Document, Schema } from 'mongoose';
import { CARE_TYPES, TASK_STATUSES } from '../utils/constants.js';

export interface ICareTask extends Document {
  branchId: mongoose.Types.ObjectId;
  scheduleId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  careType: string;
  scheduledAt: Date;
  status: 'pending' | 'completed' | 'missed' | 'skipped';
  assignedTo: mongoose.Types.ObjectId[];
  completedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  skippedBy?: mongoose.Types.ObjectId;
  skipReason?: string;
  notes?: string;
  notificationSent: boolean;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const careTaskSchema = new Schema<ICareTask>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'CareSchedule',
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
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: {
      type: Date,
    },
    skippedBy: {
      type: Schema.Types.ObjectId,
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

careTaskSchema.index({ branchId: 1, scheduledAt: 1 });
careTaskSchema.index({ branchId: 1, status: 1 });
careTaskSchema.index({ scheduledAt: 1, status: 1 });
careTaskSchema.index({ assignedTo: 1, status: 1, scheduledAt: 1 });
careTaskSchema.index({ scheduleId: 1, scheduledAt: 1 }, { unique: true });

careTaskSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const CareTask = mongoose.model<ICareTask>('CareTask', careTaskSchema);

export default CareTask;
