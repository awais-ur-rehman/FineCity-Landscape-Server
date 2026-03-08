import CareSchedule from '../models/CareSchedule.js';
import CareTask from '../models/CareTask.js';
import PlantBatch from '../models/PlantBatch.js';
import * as notificationService from './notification.service.js';

const LOOKAHEAD_DAYS = 7;
const OVERDUE_HOURS = 2;
const DUE_SOON_MINUTES = 30;
const REMINDER_MIN_MINUTES = 10;
const REMINDER_MAX_MINUTES = 20;

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const combineDateAndTime = (date: Date, timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
};

const toMidnightUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const generateTasks = async () => {
  const now = new Date();
  const endDate = addDays(now, LOOKAHEAD_DAYS);
  const schedules = await CareSchedule.find({ isActive: true });

  let totalCreated = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newTasks: any[] = [];

  for (const schedule of schedules) {
    const genStart = schedule.lastGeneratedDate
      ? addDays(toMidnightUTC(schedule.lastGeneratedDate), 1)
      : toMidnightUTC(schedule.startDate);

    const genEnd = toMidnightUTC(endDate);

    if (genStart > genEnd) continue;

    const scheduleStart = toMidnightUTC(schedule.startDate);
    const diffMs = genStart.getTime() - scheduleStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const freqDays = schedule.frequencyDays;

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
          branchId: schedule.branchId,
          careType: schedule.careType,
          scheduledAt,
          assignedTo: schedule.assignedTo,
        });
        totalCreated += 1;
        newTasks.push(task);
      } catch (err: any) {
        if (err.code !== 11000) {
          console.error('Task creation error:', err.message);
        }
      }

      current = addDays(current, freqDays);
    }

    schedule.lastGeneratedDate = genEnd;
    await schedule.save();
  }

  return { created: totalCreated, schedules: schedules.length, newTasks };
};

export const notifyDueTasks = async (): Promise<number> => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens = await notificationService.getTokensForUsers(task.assignedTo as any);
    const sent = await notificationService.sendTaskDueNotification(task, batch, tokens);

    task.notificationSent = true;
    await task.save();
    sentCount += sent;
  }

  return sentCount;
};

export const sendAdvanceReminders = async (): Promise<number> => {
  const now = new Date();
  const minCutoff = new Date(now.getTime() + REMINDER_MIN_MINUTES * 60 * 1000);
  const maxCutoff = new Date(now.getTime() + REMINDER_MAX_MINUTES * 60 * 1000);

  const tasks = await CareTask.find({
    scheduledAt: { $gte: minCutoff, $lte: maxCutoff },
    status: 'pending',
    reminderSent: false,
  });

  let sentCount = 0;

  for (const task of tasks) {
    const batch = await PlantBatch.findById(task.batchId);
    if (!batch) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens = await notificationService.getTokensForUsers(task.assignedTo as any);
    const sent = await notificationService.sendTaskReminderNotification(task, batch, tokens);

    task.reminderSent = true;
    await task.save();
    sentCount += sent;
  }

  return sentCount;
};

export const markOverdueTasks = async (): Promise<number> => {
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

export const generateTasksForSchedule = async (scheduleId: string): Promise<number> => {
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

    if (scheduledAt >= toMidnightUTC(now)) {
      try {
        await CareTask.create({
          scheduleId: schedule._id,
          batchId: schedule.batchId,
          branchId: schedule.branchId,
          careType: schedule.careType,
          scheduledAt,
          assignedTo: schedule.assignedTo,
        });
        created += 1;
      } catch (err: any) {
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
