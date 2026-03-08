import CareTask from '../models/CareTask.js';
import ApiError from '../utils/apiError.js';

interface ListTasksQuery {
  branchId?: string;
  status?: string;
  date?: string;
  careType?: string;
  batchId?: string;
  assignedTo?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const listTasks = async (
  { branchId, status, date, careType, batchId, assignedTo, from, to, page = 1, limit = 50 }: ListTasksQuery,
  userId?: string | null,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};

  if (branchId) filter.branchId = branchId;
  if (status) filter.status = status;
  if (careType) filter.careType = careType;
  if (batchId) filter.batchId = batchId;

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

export const getTaskById = async (id: string) => {
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

export const completeTask = async (id: string, userId: string, { notes, completedAt }: { notes?: string; completedAt?: Date }) => {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task.completedBy = userId as any;
  task.completedAt = completedAt || new Date();
  if (notes) task.notes = notes;

  await task.save();

  return getTaskById(task._id.toString());
};

export const skipTask = async (id: string, userId: string, reason: string) => {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task.skippedBy = userId as any;
  task.skipReason = reason;

  await task.save();

  return getTaskById(task._id.toString());
};

export const getStats = async (from: string, to: string, branchId?: string) => {
  const dateFilter: any = {
    scheduledAt: { $gte: new Date(from), $lte: new Date(to) },
  };

  if (branchId) {
    dateFilter.branchId = branchId;
  }

  const statusCounts = await CareTask.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const counts: any = { pending: 0, completed: 0, missed: 0, skipped: 0, total: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statusCounts.forEach((s: any) => {
    counts[s._id] = s.count;
    counts.total += s.count;
  });

  counts.completionRate = counts.total > 0
    ? Math.round((counts.completed / counts.total) * 100)
    : 0;

  const now = new Date();
  const overdue = await CareTask.countDocuments({
    ...dateFilter,
    status: 'pending',
    scheduledAt: { $lt: now },
  });
  counts.overdue = overdue;

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

  const byCareType = await CareTask.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { careType: '$careType', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const careTypeStats: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  byCareType.forEach((item: any) => {
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
