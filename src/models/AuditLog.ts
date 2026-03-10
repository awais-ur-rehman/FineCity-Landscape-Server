import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  entity: string;
  entityId: string;
  performedBy: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true }, // CREATE, UPDATE, DELETE, LOGIN, etc.
    entity: { type: String, required: true }, // User, PlantBatch, etc.
    entityId: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days retention

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
