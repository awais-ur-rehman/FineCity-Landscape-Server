import PlantBatch from '../models/PlantBatch.js';
import ApiError from '../utils/apiError.js';
export const listBatches = async ({ branchId, zone, category, status, search, page = 1, limit = 20 }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter = { isDeleted: false };
    if (branchId)
        filter.branchId = branchId;
    if (zone)
        filter.zone = zone;
    if (category)
        filter.category = category;
    if (status)
        filter.status = status;
    if (search) {
        const regex = { $regex: search, $options: 'i' };
        filter.$or = [{ name: regex }, { plantType: regex }];
    }
    const skip = (page - 1) * limit;
    const [batches, total] = await Promise.all([
        PlantBatch.find(filter)
            .populate('createdBy', 'name email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),
        PlantBatch.countDocuments(filter),
    ]);
    return {
        batches,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};
export const getBatchById = async (id) => {
    const batch = await PlantBatch.findOne({ _id: id, isDeleted: false })
        .populate('createdBy', 'name email');
    if (!batch) {
        throw ApiError.notFound('Plant batch not found');
    }
    return batch;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createBatch = async (data, userId) => {
    const batch = await PlantBatch.create({
        ...data,
        createdBy: userId,
    });
    return batch;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateBatch = async (id, updates) => {
    const batch = await PlantBatch.findOneAndUpdate({ _id: id, isDeleted: false }, updates, { returnDocument: 'after', runValidators: true }).populate('createdBy', 'name email');
    if (!batch) {
        throw ApiError.notFound('Plant batch not found');
    }
    return batch;
};
export const deleteBatch = async (id) => {
    const batch = await PlantBatch.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { returnDocument: 'after' });
    if (!batch) {
        throw ApiError.notFound('Plant batch not found');
    }
};
