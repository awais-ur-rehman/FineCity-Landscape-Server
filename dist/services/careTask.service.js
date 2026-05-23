import mongoose from 'mongoose';
import CareTask from '../models/CareTask.js';
import FertilizerUsage from '../models/FertilizerUsage.js';
import ApiError from '../utils/apiError.js';
export const listTasks = async ({ branchId, status, date, careType, batchId, assignedTo, from, to, page = 1, limit = 50 }, userId) => {
    const filter = {};
    if (branchId)
        filter.branchId = branchId;
    const isOverdue = status === 'overdue';
    if (isOverdue) {
        filter.status = 'pending';
    }
    else if (status) {
        filter.status = status;
    }
    if (careType)
        filter.careType = careType;
    if (batchId)
        filter.batchId = batchId;
    if (date) {
        const dayStart = new Date(date);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setUTCHours(23, 59, 59, 999);
        filter.scheduledAt = { $gte: dayStart, $lte: dayEnd };
    }
    else if (from || to) {
        filter.scheduledAt = {};
        if (from)
            filter.scheduledAt.$gte = new Date(from);
        if (to)
            filter.scheduledAt.$lte = new Date(to);
    }
    // Overdue = pending tasks with scheduledAt before now (merge with any existing date constraints)
    if (isOverdue) {
        const existing = (filter.scheduledAt ?? {});
        filter.scheduledAt = { ...existing, $lt: new Date() };
    }
    if (userId) {
        filter.assignedTo = userId;
    }
    else if (assignedTo) {
        filter.assignedTo = assignedTo;
    }
    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
        CareTask.find(filter)
            .populate('batchId', 'name plantType zone location imageUrl')
            .populate('scheduleId', 'careType scheduledTime instructions recommendedFertilizers')
            .populate('assignedTo', 'name email')
            .populate('completedBy', 'name email')
            .populate('skippedBy', 'name email')
            .populate('selectedFertilizers', 'name type')
            .skip(skip)
            .limit(limit)
            .sort({ scheduledAt: 1 })
            .lean(),
        CareTask.countDocuments(filter),
    ]);
    return {
        tasks,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
};
export const getTaskById = async (id) => {
    const task = await CareTask.findById(id)
        .populate('batchId', 'name plantType zone location imageUrl')
        .populate('scheduleId', 'careType scheduledTime instructions recommendedFertilizers')
        .populate('assignedTo', 'name email')
        .populate('completedBy', 'name email')
        .populate('selectedFertilizers', 'name type');
    if (!task) {
        throw ApiError.notFound('Care task not found');
    }
    return task;
};
export const completeTask = async (id, userId, userRole, input) => {
    const { notes, completedAt, fertilizerUsages, photoUrls } = input;
    const task = await CareTask.findById(id);
    if (!task)
        throw ApiError.notFound('Care task not found');
    if (task.status === 'completed')
        throw ApiError.badRequest('Task is already completed');
    if (task.status === 'skipped')
        throw ApiError.badRequest('Cannot complete a skipped task');
    // Employees may only complete tasks assigned to them.
    // Admins and super_admins can complete any task in their branch (controller enforces branch access).
    if (userRole === 'employee') {
        const isAssigned = task.assignedTo.some((uid) => uid.toString() === userId);
        if (!isAssigned)
            throw ApiError.forbidden('You are not assigned to this task');
    }
    const completedAtDate = completedAt || new Date();
    // Atomic: mark task complete + persist fertilizer usage in a single transaction
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            task.status = 'completed';
            task.completedBy = userId;
            task.completedAt = completedAtDate;
            if (notes)
                task.notes = notes;
            if (photoUrls && photoUrls.length > 0)
                task.photoUrls = photoUrls;
            await task.save({ session });
            if (task.careType === 'fertilizing' && fertilizerUsages && fertilizerUsages.length > 0) {
                await FertilizerUsage.findOneAndUpdate({ taskId: task._id }, {
                    taskId: task._id,
                    scheduleId: task.scheduleId,
                    batchId: task.batchId,
                    branchId: task.branchId,
                    completedBy: userId,
                    usages: fertilizerUsages,
                    notes,
                    recordedAt: completedAtDate,
                }, { upsert: true, new: true, session });
            }
        });
    }
    finally {
        await session.endSession();
    }
    return getTaskById(task._id.toString());
};
export const skipTask = async (id, userId, reason) => {
    const task = await CareTask.findById(id);
    if (!task)
        throw ApiError.notFound('Care task not found');
    if (task.status === 'completed')
        throw ApiError.badRequest('Cannot skip a completed task');
    if (task.status === 'skipped')
        throw ApiError.badRequest('Task is already skipped');
    task.status = 'skipped';
    task.skippedBy = userId;
    task.skipReason = reason;
    await task.save();
    return getTaskById(task._id.toString());
};
export const getStats = async (from, to, branchId) => {
    const dateFilter = {
        scheduledAt: { $gte: new Date(from), $lte: new Date(to) },
    };
    if (branchId)
        dateFilter.branchId = new mongoose.Types.ObjectId(branchId);
    const statusCounts = await CareTask.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = { pending: 0, completed: 0, missed: 0, skipped: 0, total: 0 };
    statusCounts.forEach((s) => {
        counts[s._id] = s.count;
        counts.total += s.count;
    });
    counts.completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
    const now = new Date();
    counts.overdue = await CareTask.countDocuments({
        ...dateFilter,
        status: 'pending',
        scheduledAt: { $lt: now },
    });
    const byEmployee = await CareTask.aggregate([
        { $match: { ...dateFilter, status: 'completed' } },
        { $unwind: '$completedBy' },
        { $group: { _id: '$completedBy', completedCount: { $sum: 1 } } },
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
        { $limit: 10 },
    ]);
    const byCareType = await CareTask.aggregate([
        { $match: dateFilter },
        { $group: { _id: { careType: '$careType', status: '$status' }, count: { $sum: 1 } } },
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
    return { ...counts, byEmployee, byCareType: careTypeStats };
};
export const exportTasksCsv = async (from, to, branchId) => {
    const filter = {
        scheduledAt: { $gte: new Date(from), $lte: new Date(to) },
    };
    if (branchId)
        filter.branchId = new mongoose.Types.ObjectId(branchId);
    const tasks = await CareTask.find(filter)
        .populate('batchId', 'name')
        .populate('completedBy', 'name')
        .populate('assignedTo', 'name')
        .lean();
    const escape = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const headers = ['Scheduled At', 'Batch', 'Care Type', 'Status', 'Assigned To', 'Completed By', 'Completed At', 'Notes'];
    const rows = tasks.map((t) => [
        new Date(t.scheduledAt).toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        t.batchId?.name ?? '',
        t.careType,
        t.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        t.assignedTo.map((u) => u?.name ?? u).join('; '),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        t.completedBy?.name ?? '',
        t.completedAt ? new Date(t.completedAt).toISOString() : '',
        t.notes ?? '',
    ].map(escape).join(','));
    return [headers.join(','), ...rows].join('\r\n');
};
export const getFertilizerUsageHistory = async ({ branchId, batchId, scheduleId, completedBy, from, to, page = 1, limit = 20, }) => {
    const filter = {};
    if (branchId)
        filter.branchId = branchId;
    if (batchId)
        filter.batchId = batchId;
    if (scheduleId)
        filter.scheduleId = scheduleId;
    if (completedBy)
        filter.completedBy = completedBy;
    if (from || to) {
        filter.recordedAt = {};
        if (from)
            filter.recordedAt.$gte = new Date(from);
        if (to)
            filter.recordedAt.$lte = new Date(to);
    }
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
        FertilizerUsage.find(filter)
            .populate('taskId', 'scheduledAt careType status')
            .populate('batchId', 'name zone')
            .populate('completedBy', 'name email')
            .populate('usages.fertilizerId', 'name type')
            .skip(skip)
            .limit(limit)
            .sort({ recordedAt: -1 }),
        FertilizerUsage.countDocuments(filter),
    ]);
    return { records, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};
