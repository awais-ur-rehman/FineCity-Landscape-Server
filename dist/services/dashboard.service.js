import mongoose from 'mongoose';
import CareTask from '../models/CareTask.js';
import PlantBatch from '../models/PlantBatch.js';
import CareSchedule from '../models/CareSchedule.js';
export const getSummary = async (branchId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter = {};
    if (branchId)
        filter.branchId = branchId;
    const [totalPlants, activeSchedules, pendingTasks, overdueTasks,] = await Promise.all([
        PlantBatch.countDocuments({ ...filter, isDeleted: false, status: 'active' }),
        CareSchedule.countDocuments({ ...filter, isActive: true }),
        CareTask.countDocuments({ ...filter, status: 'pending' }),
        CareTask.countDocuments({ ...filter, status: 'pending', scheduledAt: { $lt: new Date() } }),
    ]);
    return { totalPlants, activeSchedules, pendingTasks, overdueTasks };
};
export const getTasksByStatus = async (from, to, branchId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = { scheduledAt: { $gte: from, $lte: to } };
    if (branchId)
        match.branchId = new mongoose.Types.ObjectId(branchId);
    const stats = await CareTask.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const result = { pending: 0, completed: 0, missed: 0, skipped: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stats.forEach((s) => {
        // @ts-ignore
        result[s._id] = s.count;
    });
    return result;
};
export const getUserPerformance = async (from, to, branchId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = {
        scheduledAt: { $gte: from, $lte: to },
        status: 'completed',
    };
    if (branchId)
        match.branchId = new mongoose.Types.ObjectId(branchId);
    return CareTask.aggregate([
        { $match: match },
        { $unwind: '$completedBy' },
        {
            $group: {
                _id: '$completedBy',
                count: { $sum: 1 },
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
                count: 1,
            },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);
};
