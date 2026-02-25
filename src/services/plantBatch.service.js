import PlantBatch from '../models/PlantBatch.js';
import ApiError from '../utils/apiError.js';

/**
 * List plant batches with pagination, search, and filters.
 * @param {Object} query - Filter/pagination params
 * @returns {Promise<{batches: Array, pagination: Object}>}
 */
export const listBatches = async ({ zone, category, status, search, page = 1, limit = 20 }) => {
  const filter = { isDeleted: false };

  if (zone) filter.zone = zone;
  if (category) filter.category = category;
  if (status) filter.status = status;

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

/**
 * Get a single plant batch by ID.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const getBatchById = async (id) => {
  const batch = await PlantBatch.findOne({ _id: id, isDeleted: false })
    .populate('createdBy', 'name email');

  if (!batch) {
    throw ApiError.notFound('Plant batch not found');
  }

  return batch;
};

/**
 * Create a new plant batch.
 * @param {Object} data - Batch data
 * @param {string} userId - ID of the creating admin
 * @returns {Promise<Object>}
 */
export const createBatch = async (data, userId) => {
  const batch = await PlantBatch.create({
    ...data,
    createdBy: userId,
  });

  return batch;
};

/**
 * Update an existing plant batch.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export const updateBatch = async (id, updates) => {
  const batch = await PlantBatch.findOneAndUpdate(
    { _id: id, isDeleted: false },
    updates,
    { returnDocument: 'after', runValidators: true },
  ).populate('createdBy', 'name email');

  if (!batch) {
    throw ApiError.notFound('Plant batch not found');
  }

  return batch;
};

/**
 * Soft-delete a plant batch.
 * @param {string} id
 * @returns {Promise<void>}
 */
export const deleteBatch = async (id) => {
  const batch = await PlantBatch.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { returnDocument: 'after' },
  );

  if (!batch) {
    throw ApiError.notFound('Plant batch not found');
  }
};
