import Fertilizer from '../models/Fertilizer.js';
import ApiError from '../utils/apiError.js';
export const listFertilizers = async ({ branchId, type, search, isActive, page = 1, limit = 20 }) => {
    const filter = {};
    const safeLimit = Math.min(limit, 100);
    if (branchId)
        filter.branchId = branchId;
    if (type)
        filter.type = type;
    if (typeof isActive === 'boolean')
        filter.isActive = isActive;
    if (search)
        filter.name = { $regex: search, $options: 'i' };
    const skip = (page - 1) * safeLimit;
    const [fertilizers, total] = await Promise.all([
        Fertilizer.find(filter)
            .populate('createdBy', 'name email')
            .skip(skip)
            .limit(safeLimit)
            .sort({ createdAt: -1 })
            .lean(),
        Fertilizer.countDocuments(filter),
    ]);
    return {
        fertilizers,
        pagination: { page, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    };
};
export const getFertilizerById = async (id) => {
    const fertilizer = await Fertilizer.findById(id).populate('createdBy', 'name email');
    if (!fertilizer)
        throw ApiError.notFound('Fertilizer not found');
    return fertilizer;
};
export const createFertilizer = async (data, userId, branchId) => {
    const fertilizer = await Fertilizer.create({ ...data, branchId, createdBy: userId });
    return fertilizer;
};
export const updateFertilizer = async (id, updates, userBranches, isSuperAdmin) => {
    const existing = await Fertilizer.findById(id);
    if (!existing)
        throw ApiError.notFound('Fertilizer not found');
    if (!isSuperAdmin) {
        const hasAccess = userBranches.includes(existing.branchId.toString());
        if (!hasAccess)
            throw ApiError.forbidden('Access denied to this fertilizer');
    }
    const fertilizer = await Fertilizer.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
    }).populate('createdBy', 'name email');
    return fertilizer;
};
export const deleteFertilizer = async (id, userBranches, isSuperAdmin) => {
    const existing = await Fertilizer.findById(id);
    if (!existing)
        throw ApiError.notFound('Fertilizer not found');
    if (!isSuperAdmin) {
        const hasAccess = userBranches.includes(existing.branchId.toString());
        if (!hasAccess)
            throw ApiError.forbidden('Access denied to this fertilizer');
    }
    await Fertilizer.findByIdAndUpdate(id, { isActive: false });
};
