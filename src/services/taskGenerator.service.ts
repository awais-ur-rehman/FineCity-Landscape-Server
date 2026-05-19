import CareSchedule from '../models/CareSchedule.js';
import CareTask from '../models/CareTask.js';
import PlantBatch from '../models/PlantBatch.js';
import * as notificationService from './notification.service.js';

const LOOKAHEAD_DAYS = 7;
const OVERDUE_HOURS = 2;
const DUE_SOON_MINUTES = 30;
const REMINDER_MIN_MINUTES = 10;
const REMINDER_MAX_MINUTES = 20;
const SCHEDULE_BATCH_SIZE = 100;

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
  const genEnd = toMidnightUTC(endDate);

  let totalCreated = 0;
  let offset = 0;

  // Process schedules in batches to avoid loading entire collection into memory
  while (true) {
    const schedules = await CareSchedule.find({ isActive: true })
      .skip(offset)
      .limit(SCHEDULE_BATCH_SIZE)
      .lean();

    if (schedules.length === 0) break;

    for (const schedule of schedules) {
      const genStart = schedule.lastGeneratedDate
        ? addDays(toMidnightUTC(schedule.lastGeneratedDate), 1)
        : toMidnightUTC(schedule.startDate);

      if (genStart > genEnd) continue;

      const scheduleStart = toMidnightUTC(schedule.startDate);
      const diffDays = Math.floor(
        (genStart.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const freqDays = schedule.frequencyDays;
      let offsetDays = diffDays < 0 ? 0 : diffDays;
      const remainder = offsetDays % freqDays;
      if (remainder !== 0) offsetDays += freqDays - remainder;

      let current = addDays(scheduleStart, offsetDays);
      const taskInserts: Parameters<typeof CareTask.create>[0][] = [];

      while (current <= genEnd) {
        taskInserts.push({
          scheduleId: schedule._id,
          batchId: schedule.batchId,
          branchId: schedule.branchId,
          careType: schedule.careType,
          scheduledAt: combineDateAndTime(current, schedule.scheduledTime),
          assignedTo: schedule.assignedTo,
          selectedFertilizers: schedule.recommendedFertilizers || [],
        });
        current = addDays(current, freqDays);
      }

      // insertMany with ordered:false so duplicate key errors skip without aborting the batch
      if (taskInserts.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = (await CareTask.insertMany(taskInserts, { ordered: false } as any)) as unknown as unknown[];
          totalCreated += result.length;
        } catch (err: unknown) {
          // BulkWriteError: some docs may have inserted, some skipped due to unique constraint
          if ((err as { code?: number }).code === 11000) {
            const inserted = (err as { insertedDocs?: unknown[] }).insertedDocs?.length ?? 0;
            totalCreated += inserted;
          } else {
            console.error('Task batch insert error:', (err as Error).message);
          }
        }
      }

      // Update lastGeneratedDate for this schedule
      await CareSchedule.updateOne({ _id: schedule._id }, { lastGeneratedDate: genEnd });
    }

    offset += SCHEDULE_BATCH_SIZE;
    if (schedules.length < SCHEDULE_BATCH_SIZE) break;
  }

  return { created: totalCreated };
};

export const notifyDueTasks = async (): Promise<number> => {
  const now = new Date();
  const soonCutoff = new Date(now.getTime() + DUE_SOON_MINUTES * 60 * 1000);

  const dueTasks = await CareTask.find({
    scheduledAt: { $gte: now, $lte: soonCutoff },
    status: 'pending',
    notificationSent: false,
  }).lean();

  if (dueTasks.length === 0) return 0;

  // Batch-load all needed plant batches — eliminates N+1
  const batchIds = [...new Set(dueTasks.map((t) => t.batchId.toString()))];
  const batches = await PlantBatch.find({ _id: { $in: batchIds } }).lean();
  const batchMap = new Map(batches.map((b) => [b._id.toString(), b]));

  // Process all tasks in parallel
  const results = await Promise.allSettled(
    dueTasks.map(async (task) => {
      const batch = batchMap.get(task.batchId.toString());
      if (!batch) return 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokens = await notificationService.getTokensForUsers(task.assignedTo as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sent = await notificationService.sendTaskDueNotification(task as any, batch as any, tokens);
      await CareTask.updateOne({ _id: task._id }, { notificationSent: true });
      return sent;
    }),
  );

  return results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0);
};

export const sendAdvanceReminders = async (): Promise<number> => {
  const now = new Date();
  const minCutoff = new Date(now.getTime() + REMINDER_MIN_MINUTES * 60 * 1000);
  const maxCutoff = new Date(now.getTime() + REMINDER_MAX_MINUTES * 60 * 1000);

  const tasks = await CareTask.find({
    scheduledAt: { $gte: minCutoff, $lte: maxCutoff },
    status: 'pending',
    reminderSent: false,
  }).lean();

  if (tasks.length === 0) return 0;

  // Batch-load all needed plant batches — eliminates N+1
  const batchIds = [...new Set(tasks.map((t) => t.batchId.toString()))];
  const batches = await PlantBatch.find({ _id: { $in: batchIds } }).lean();
  const batchMap = new Map(batches.map((b) => [b._id.toString(), b]));

  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      const batch = batchMap.get(task.batchId.toString());
      if (!batch) return 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokens = await notificationService.getTokensForUsers(task.assignedTo as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sent = await notificationService.sendTaskReminderNotification(task as any, batch as any, tokens);
      await CareTask.updateOne({ _id: task._id }, { reminderSent: true });
      return sent;
    }),
  );

  return results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0);
};

export const markOverdueTasks = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - OVERDUE_HOURS * 60 * 60 * 1000);

  const result = await CareTask.updateMany(
    { scheduledAt: { $lt: cutoff }, status: 'pending' },
    { status: 'missed' },
  );

  return result.modifiedCount;
};

export const generateTasksForSchedule = async (scheduleId: string): Promise<number> => {
  const schedule = await CareSchedule.findById(scheduleId);
  if (!schedule || !schedule.isActive) return 0;

  const now = new Date();
  const genStart = toMidnightUTC(schedule.startDate);
  const genEnd = toMidnightUTC(addDays(now, LOOKAHEAD_DAYS));

  const taskInserts: Parameters<typeof CareTask.create>[0][] = [];
  let current = new Date(genStart);

  while (current <= genEnd) {
    const scheduledAt = combineDateAndTime(current, schedule.scheduledTime);
    if (scheduledAt >= toMidnightUTC(now)) {
      taskInserts.push({
        scheduleId: schedule._id,
        batchId: schedule.batchId,
        branchId: schedule.branchId,
        careType: schedule.careType,
        scheduledAt,
        assignedTo: schedule.assignedTo,
        selectedFertilizers: schedule.recommendedFertilizers || [],
      });
    }
    current = addDays(current, schedule.frequencyDays);
  }

  let created = 0;
  if (taskInserts.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (await CareTask.insertMany(taskInserts, { ordered: false } as any)) as unknown as unknown[];
      created = result.length;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        created = (err as { insertedDocs?: unknown[] }).insertedDocs?.length ?? 0;
      } else {
        console.error('generateTasksForSchedule error:', (err as Error).message);
      }
    }
  }

  schedule.lastGeneratedDate = genEnd;
  await schedule.save();

  return created;
};
