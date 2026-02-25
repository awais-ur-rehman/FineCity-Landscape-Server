import CareTask from '../models/CareTask.js';
import ApiError from '../utils/apiError.js';

/**
 * List care tasks with filters and pagination.
 * If userId is provided, auto-filters to tasks assigned to that user.
 * @param {Object} query
 * @param {string} [userId] - If provided, filter to user's assigned tasks
 * @returns {Promise<{tasks: Array, pagination: Object}>}
 */
export const listTasks = async (
  { status, date, careType, batchId, assignedTo, from, to, page = 1, limit = 50 },
  userId,
) => {
  const filter = {};

  if (status) filter.status = status;
  if (careType) filter.careType = careType;
  if (batchId) filter.batchId = batchId;

  // Date filtering
  if (date) {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);
    filter.scheduledAt = { $gte: dayStart, $lte: dayEnd };
  } else if (from || to) {
    filter.scheduledAt = {};
    if (from) filter.scheduledAt.$gte = new Date(from);
    if (to) filter.scheduledAt.$lte = new Date(to);
  }

  // Employee auto-filter: only their assigned tasks
  if (userId) {
    filter.assignedTo = userId;
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    CareTask.find(filter)
      .populate('batchId', 'name plantType zone location imageUrl')
      .populate('scheduleId', 'careType scheduledTime instructions')
      .populate('assignedTo', 'name email')
      .populate('completedBy', 'name email')
      .populate('skippedBy', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ scheduledAt: 1 }),
    CareTask.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

/**
 * Get a single care task by ID.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const getTaskById = async (id) => {
  const task = await CareTask.findById(id)
    .populate('batchId', 'name plantType zone location imageUrl')
    .populate('scheduleId', 'careType scheduledTime instructions')
    .populate('assignedTo', 'name email')
    .populate('completedBy', 'name email');

  if (!task) {
    throw ApiError.notFound('Care task not found');
  }

  return task;
};

/**
 * Mark a task as completed.
 * @param {string} id
 * @param {string} userId
 * @param {Object} data - { notes, completedAt }
 * @returns {Promise<Object>}
 */
export const completeTask = async (id, userId, { notes, completedAt }) => {
  const task = await CareTask.findById(id);

  if (!task) {
    throw ApiError.notFound('Care task not found');
  }

  if (task.status === 'completed') {
    throw ApiError.badRequest('Task is already completed');
  }

  if (task.status === 'skipped') {
    throw ApiError.badRequest('Cannot complete a skipped task');
  }

  task.status = 'completed';
  task.completedBy = userId;
  task.completedAt = completedAt || new Date();
  if (notes) task.notes = notes;

  await task.save();

  return getTaskById(task._id);
};

/**
 * Skip a task (admin only).
 * @param {string} id
 * @param {string} userId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
export const skipTask = async (id, userId, reason) => {
  const task = await CareTask.findById(id);

  if (!task) {
    throw ApiError.notFound('Care task not found');
  }

  if (task.status === 'completed') {
    throw ApiError.badRequest('Cannot skip a completed task');
  }

  if (task.status === 'skipped') {
    throw ApiError.badRequest('Task is already skipped');
  }

  task.status = 'skipped';
  task.skippedBy = userId;
  task.skipReason = reason;

  await task.save();

  return getTaskById(task._id);
};

/**
 * Get task statistics for a date range.
 * @param {Date} from
 * @param {Date} to
 * @returns {Promise<Object>}
 */
export const getStats = async (from, to) => {
  const dateFilter = {
    scheduledAt: { $gte: new Date(from), $lte: new Date(to) },
  };

  // Overall counts by status
  const statusCounts = await CareTask.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = { pending: 0, completed: 0, missed: 0, skipped: 0, total: 0 };
  statusCounts.forEach((s) => {
    counts[s._id] = s.count;
    counts.total += s.count;
  });

  counts.completionRate = counts.total > 0
    ? Math.round((counts.completed / counts.total) * 100)
    : 0;

  // Overdue: pending tasks past their scheduled time
  const now = new Date();
  const overdue = await CareTask.countDocuments({
    ...dateFilter,
    status: 'pending',
    scheduledAt: { $lt: now },
  });
  counts.overdue = overdue;

  // Per-employee breakdown
  const byEmployee = await CareTask.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    { $unwind: '$completedBy' },
    {
      $group: {
        _id: '$completedBy',
        completedCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        completedCount: 1,
      },
    },
    { $sort: { completedCount: -1 } },
  ]);

  // By care type breakdown
  const byCareType = await CareTask.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { careType: '$careType', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const careTypeStats = {};
  byCareType.forEach((item) => {
    const { careType, status } = item._id;
    if (!careTypeStats[careType]) {
      careTypeStats[careType] = { total: 0, completed: 0, pending: 0, missed: 0, skipped: 0 };
    }
    careTypeStats[careType][status] = item.count;
    careTypeStats[careType].total += item.count;
  });

  return {
    ...counts,
    byEmployee,
    byCareType: careTypeStats,
  };
};
