import CareSchedule from '../models/CareSchedule.js';
import CareTask from '../models/CareTask.js';
import PlantBatch from '../models/PlantBatch.js';
import * as notificationService from './notification.service.js';

const LOOKAHEAD_DAYS = 7;
const OVERDUE_HOURS = 2;
const DUE_SOON_MINUTES = 30;

/**
 * Add days to a date (midnight UTC).
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

/**
 * Combine a date and HH:mm time string into a full UTC Date.
 * @param {Date} date
 * @param {string} timeStr - "HH:mm"
 * @returns {Date}
 */
const combineDateAndTime = (date, timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
};

/**
 * Get midnight UTC for a given date.
 * @param {Date} date
 * @returns {Date}
 */
const toMidnightUTC = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Generate care tasks from active schedules.
 * Idempotent — skips dates that already have tasks.
 * @returns {Promise<{created: number, schedules: number}>}
 */
export const generateTasks = async () => {
  const now = new Date();
  const endDate = addDays(now, LOOKAHEAD_DAYS);
  const schedules = await CareSchedule.find({ isActive: true });

  let totalCreated = 0;
  const newTasks = [];

  for (const schedule of schedules) {
    // Determine start point for generation
    const genStart = schedule.lastGeneratedDate
      ? addDays(toMidnightUTC(schedule.lastGeneratedDate), 1)
      : toMidnightUTC(schedule.startDate);

    const genEnd = toMidnightUTC(endDate);

    if (genStart > genEnd) continue;

    // Walk from genStart to genEnd, stepping by frequencyDays
    // First find the first valid date >= genStart based on schedule rhythm
    const scheduleStart = toMidnightUTC(schedule.startDate);
    const diffMs = genStart.getTime() - scheduleStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const freqDays = schedule.frequencyDays;

    // Skip to the next occurrence on or after genStart
    let offsetDays = diffDays < 0 ? 0 : diffDays;
    const remainder = offsetDays % freqDays;
    if (remainder !== 0) {
      offsetDays += freqDays - remainder;
    }

    let current = addDays(scheduleStart, offsetDays);

    while (current <= genEnd) {
      const scheduledAt = combineDateAndTime(current, schedule.scheduledTime);

      try {
        const task = await CareTask.create({
          scheduleId: schedule._id,
          batchId: schedule.batchId,
          careType: schedule.careType,
          scheduledAt,
          assignedTo: schedule.assignedTo,
        });
        totalCreated += 1;
        newTasks.push(task);
      } catch (err) {
        // Duplicate key (scheduleId + scheduledAt) → task already exists, skip
        if (err.code !== 11000) {
          console.error('Task creation error:', err.message);
        }
      }

      current = addDays(current, freqDays);
    }

    // Update lastGeneratedDate to the end of generation window
    schedule.lastGeneratedDate = genEnd;
    await schedule.save();
  }

  return { created: totalCreated, schedules: schedules.length, newTasks };
};

/**
 * Send notifications for tasks due within the next N minutes.
 * @returns {Promise<number>} Number of notifications sent
 */
export const notifyDueTasks = async () => {
  const now = new Date();
  const soonCutoff = new Date(now.getTime() + DUE_SOON_MINUTES * 60 * 1000);

  const dueTasks = await CareTask.find({
    scheduledAt: { $gte: now, $lte: soonCutoff },
    status: 'pending',
    notificationSent: false,
  });

  let sentCount = 0;

  for (const task of dueTasks) {
    const batch = await PlantBatch.findById(task.batchId);
    if (!batch) continue;

    const tokens = await notificationService.getTokensForUsers(task.assignedTo);
    const sent = await notificationService.sendTaskDueNotification(task, batch, tokens);

    task.notificationSent = true;
    await task.save();
    sentCount += sent;
  }

  return sentCount;
};

/**
 * Mark overdue tasks (pending + scheduledAt older than OVERDUE_HOURS) as missed.
 * @returns {Promise<number>} Number of tasks marked missed
 */
export const markOverdueTasks = async () => {
  const cutoff = new Date(Date.now() - OVERDUE_HOURS * 60 * 60 * 1000);

  const result = await CareTask.updateMany(
    {
      scheduledAt: { $lt: cutoff },
      status: 'pending',
    },
    {
      status: 'missed',
    },
  );

  return result.modifiedCount;
};

/**
 * Generate tasks for a specific schedule (used when creating/updating schedules).
 * @param {string} scheduleId
 * @returns {Promise<number>} Number of tasks created
 */
export const generateTasksForSchedule = async (scheduleId) => {
  const schedule = await CareSchedule.findById(scheduleId);
  if (!schedule || !schedule.isActive) return 0;

  const now = new Date();
  const endDate = addDays(now, LOOKAHEAD_DAYS);
  const genStart = toMidnightUTC(schedule.startDate);
  const genEnd = toMidnightUTC(endDate);

  let created = 0;
  let current = new Date(genStart);

  while (current <= genEnd) {
    const scheduledAt = combineDateAndTime(current, schedule.scheduledTime);

    // Only create future tasks (or today's)
    if (scheduledAt >= toMidnightUTC(now)) {
      try {
        await CareTask.create({
          scheduleId: schedule._id,
          batchId: schedule.batchId,
          careType: schedule.careType,
          scheduledAt,
          assignedTo: schedule.assignedTo,
        });
        created += 1;
      } catch (err) {
        if (err.code !== 11000) {
          console.error('Task creation error:', err.message);
        }
      }
    }

    current = addDays(current, schedule.frequencyDays);
  }

  schedule.lastGeneratedDate = genEnd;
  await schedule.save();

  return created;
};
