import CareSchedule from '../models/CareSchedule.js';
import CareTask from '../models/CareTask.js';
import PlantBatch from '../models/PlantBatch.js';
import ApiError from '../utils/apiError.js';
import { generateTasksForSchedule } from './taskGenerator.service.js';
import * as notificationService from './notification.service.js';

/**
 * List care schedules with filters and pagination.
 * @param {Object} query
 * @returns {Promise<{schedules: Array, pagination: Object}>}
 */
export const listSchedules = async ({ batchId, careType, isActive, page = 1, limit = 20 }) => {
  const filter = {};

  if (batchId) filter.batchId = batchId;
  if (careType) filter.careType = careType;
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;

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

/**
 * Get a single care schedule by ID.
 * @param {string} id
 * @returns {Promise<Object>}
 */
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

/**
 * Create a care schedule and trigger initial task generation.
 * @param {Object} data
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const createSchedule = async (data, userId) => {
  // Verify batch exists
  const batch = await PlantBatch.findOne({ _id: data.batchId, isDeleted: false });
  if (!batch) {
    throw ApiError.notFound('Plant batch not found');
  }

  const schedule = await CareSchedule.create({
    ...data,
    createdBy: userId,
  });

  // Generate tasks immediately
  await generateTasksForSchedule(schedule._id);

  // Notify assigned employees
  if (schedule.assignedTo.length > 0) {
    const tokens = await notificationService.getTokensForUsers(schedule.assignedTo);
    await notificationService.sendScheduleUpdateNotification(schedule, 'created', tokens);
  }

  // Return populated schedule
  return getScheduleById(schedule._id);
};

/**
 * Update a care schedule. If frequency/time/assignedTo changed, regenerate future tasks.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export const updateSchedule = async (id, updates) => {
  const schedule = await CareSchedule.findById(id);
  if (!schedule) {
    throw ApiError.notFound('Care schedule not found');
  }

  const needsRegeneration =
    updates.frequencyDays !== undefined ||
    updates.scheduledTime !== undefined ||
    updates.assignedTo !== undefined;

  Object.assign(schedule, updates);
  await schedule.save();

  if (needsRegeneration && schedule.isActive) {
    // Cancel future pending tasks
    await CareTask.deleteMany({
      scheduleId: schedule._id,
      status: 'pending',
      scheduledAt: { $gte: new Date() },
    });

    // Regenerate
    schedule.lastGeneratedDate = null;
    await schedule.save();
    await generateTasksForSchedule(schedule._id);
  }

  // Notify assigned employees
  if (schedule.assignedTo.length > 0) {
    const tokens = await notificationService.getTokensForUsers(schedule.assignedTo);
    await notificationService.sendScheduleUpdateNotification(schedule, 'updated', tokens);
  }

  return getScheduleById(schedule._id);
};

/**
 * Deactivate a schedule and cancel all future pending tasks.
 * @param {string} id
 * @returns {Promise<void>}
 */
export const deleteSchedule = async (id) => {
  const schedule = await CareSchedule.findById(id);
  if (!schedule) {
    throw ApiError.notFound('Care schedule not found');
  }

  schedule.isActive = false;
  await schedule.save();

  // Cancel future pending tasks
  await CareTask.updateMany(
    {
      scheduleId: schedule._id,
      status: 'pending',
      scheduledAt: { $gte: new Date() },
    },
    { status: 'skipped', skipReason: 'Schedule deactivated' },
  );

  // Notify
  if (schedule.assignedTo.length > 0) {
    const tokens = await notificationService.getTokensForUsers(schedule.assignedTo);
    await notificationService.sendScheduleUpdateNotification(schedule, 'deactivated', tokens);
  }
};
