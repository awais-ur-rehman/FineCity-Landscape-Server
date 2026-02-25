import cron from 'node-cron';
import env from '../config/env.js';
import { generateTasks, notifyDueTasks, markOverdueTasks } from '../services/taskGenerator.service.js';

/**
 * Start the task generator cron job.
 * Runs on the schedule defined by TASK_GENERATOR_CRON (default: every hour).
 *
 * Each run:
 * 1. Generates tasks from active schedules (7-day lookahead)
 * 2. Sends push notifications for tasks due within 30 min
 * 3. Marks tasks overdue by 2+ hours as missed
 */
const startTaskGeneratorCron = () => {
  const schedule = env.TASK_GENERATOR_CRON;

  if (!cron.validate(schedule)) {
    console.error(`Invalid cron expression: ${schedule}`);
    return;
  }

  cron.schedule(schedule, async () => {
    const startTime = Date.now();
    console.log('[Cron] Task generator started');

    try {
      // Step 1: Generate tasks
      const { created, schedules } = await generateTasks();
      console.log(`[Cron] Generated ${created} tasks from ${schedules} schedules`);

      // Step 2: Send notifications for due-soon tasks
      const notified = await notifyDueTasks();
      if (notified > 0) {
        console.log(`[Cron] Sent ${notified} push notifications`);
      }

      // Step 3: Mark overdue tasks as missed
      const missed = await markOverdueTasks();
      if (missed > 0) {
        console.log(`[Cron] Marked ${missed} tasks as missed`);
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Cron] Task generator completed in ${elapsed}ms`);
    } catch (error) {
      console.error('[Cron] Task generator error:', error);
    }
  });

  console.log(`Task generator cron scheduled: ${schedule}`);
};

export default startTaskGeneratorCron;
