import CareSchedule from '../models/CareSchedule.js';
import CareTask from '../models/CareTask.js';
import PlantBatch from '../models/PlantBatch.js';
import ApiError from '../utils/apiError.js';
import { generateTasksForSchedule } from './taskGenerator.service.js';
import * as notificationService from './notification.service.js';
export const listSchedules = async ({ branchId, batchId, careType, isActive, page = 1, limit = 20 }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter = {};
    if (branchId)
        filter.branchId = branchId;
    if (batchId)
        filter.batchId = batchId;
    if (careType)
        filter.careType = careType;
    if (isActive !== undefined)
        filter.isActive = isActive === 'true' || isActive === true;
    const skip = (page - 1) * limit;
    const [schedules, total] = await Promise.all([
        CareSchedule.find(filter)
            .populate('batchId', 'name plantType zone location')
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),
        CareSchedule.countDocuments(filter),
    ]);
    return {
        schedules,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
};
export const getScheduleById = async (id) => {
    const schedule = await CareSchedule.findById(id)
        .populate('batchId', 'name plantType zone location')
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email');
    if (!schedule) {
        throw ApiError.notFound('Care schedule not found');
    }
    return schedule;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSchedule = async (data, userId) => {
    const batch = await PlantBatch.findOne({ _id: data.batchId, isDeleted: false });
    if (!batch) {
        throw ApiError.notFound('Plant batch not found');
    }
    const schedule = await CareSchedule.create({
        ...data,
        branchId: batch.branchId,
        createdBy: userId,
    });
    await generateTasksForSchedule(schedule._id.toString());
    if (schedule.assignedTo.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokens = await notificationService.getTokensForUsers(schedule.assignedTo);
        await notificationService.sendScheduleUpdateNotification(schedule, 'created', tokens);
    }
    return getScheduleById(schedule._id.toString());
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateSchedule = async (id, updates) => {
    const schedule = await CareSchedule.findById(id);
    if (!schedule) {
        throw ApiError.notFound('Care schedule not found');
    }
    const needsRegeneration = updates.frequencyDays !== undefined ||
        updates.scheduledTime !== undefined ||
        updates.assignedTo !== undefined;
    Object.assign(schedule, updates);
    await schedule.save();
    if (needsRegeneration && schedule.isActive) {
        await CareTask.deleteMany({
            scheduleId: schedule._id,
            status: 'pending',
            scheduledAt: { $gte: new Date() },
        });
        schedule.lastGeneratedDate = undefined;
        await schedule.save();
        await generateTasksForSchedule(schedule._id.toString());
    }
    if (schedule.assignedTo.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokens = await notificationService.getTokensForUsers(schedule.assignedTo);
        await notificationService.sendScheduleUpdateNotification(schedule, 'updated', tokens);
    }
    return getScheduleById(schedule._id.toString());
};
export const deleteSchedule = async (id) => {
    const schedule = await CareSchedule.findById(id);
    if (!schedule) {
        throw ApiError.notFound('Care schedule not found');
    }
    schedule.isActive = false;
    await schedule.save();
    await CareTask.updateMany({
        scheduleId: schedule._id,
        status: 'pending',
        scheduledAt: { $gte: new Date() },
    }, { status: 'skipped', skipReason: 'Schedule deactivated' });
    if (schedule.assignedTo.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokens = await notificationService.getTokensForUsers(schedule.assignedTo);
        await notificationService.sendScheduleUpdateNotification(schedule, 'deactivated', tokens);
    }
};
