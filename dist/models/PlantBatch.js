import mongoose, { Schema } from 'mongoose';
const plantBatchSchema = new Schema({
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
}, {
    timestamps: true,
});
plantBatchSchema.index({ branchId: 1, status: 1 });
plantBatchSchema.index({ branchId: 1, zone: 1 });
plantBatchSchema.index({ branchId: 1, category: 1 });
plantBatchSchema.index({ name: 'text', scientificName: 'text' });
plantBatchSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};
// Pre-save hook to generate displayName
plantBatchSchema.pre('save', async function () {
    if (this.isModified('name') || this.isModified('zone')) {
        // We need to populate zone to get its name/code if we want to use it in displayName
        // But pre-save is synchronous-ish regarding 'this'.
        // We can't easily populate 'this' inside pre-save without fetching again.
        // For now, let's just use name.
        this.displayName = this.name;
    }
});
const PlantBatch = mongoose.model('PlantBatch', plantBatchSchema);
export default PlantBatch;
