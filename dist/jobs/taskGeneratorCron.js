import cron from 'node-cron';
import env from '../config/env.js';
import { generateTasks, sendAdvanceReminders, notifyDueTasks, markOverdueTasks, } from '../services/taskGenerator.service.js';
/**
 * JOB 1 — Task Generator
 * Runs daily. Generates CareTask instances for the next 30 days from all active schedules.
 */
const startTaskGeneratorJob = () => {
    const schedule = env.TASK_GENERATOR_CRON;
    if (!cron.validate(schedule)) {
        console.error(`[Cron] Invalid TASK_GENERATOR_CRON: "${schedule}"`);
        return;
    }
    cron.schedule(schedule, async () => {
        const start = Date.now();
        console.log('[Cron:Generator] Starting task generation');
        try {
            const { created, schedules } = (await generateTasks());
            console.log(`[Cron:Generator] Generated ${created} tasks from ${schedules} schedules in ${Date.now() - start}ms`);
        }
        catch (err) {
            console.error('[Cron:Generator] Error:', err);
        }
    });
    console.log(`[Cron:Generator] Scheduled: ${schedule}`);
};
/**
 * JOB 2 — Task Due Notifier
 * Runs every 5 minutes. Sends FCM push for tasks due within the next 30 minutes.
 */
const startDueNotifierJob = () => {
    const schedule = env.TASK_DUE_NOTIFIER_CRON;
    if (!cron.validate(schedule)) {
        console.error(`[Cron] Invalid TASK_DUE_NOTIFIER_CRON: "${schedule}"`);
        return;
    }
    cron.schedule(schedule, async () => {
        try {
            const sent = await notifyDueTasks();
            if (sent > 0)
                console.log(`[Cron:DueNotifier] Sent ${sent} due-now notifications`);
        }
        catch (err) {
            console.error('[Cron:DueNotifier] Error:', err);
        }
    });
    console.log(`[Cron:DueNotifier] Scheduled: ${schedule}`);
};
/**
 * JOB 3 — Advance Reminder Sender
 * Runs every 5 minutes. Sends FCM push 10–20 minutes before a task is due.
 */
const startAdvanceReminderJob = () => {
    const schedule = env.TASK_REMINDER_CRON;
    if (!cron.validate(schedule)) {
        console.error(`[Cron] Invalid TASK_REMINDER_CRON: "${schedule}"`);
        return;
    }
    cron.schedule(schedule, async () => {
        try {
            const sent = await sendAdvanceReminders();
            if (sent > 0)
                console.log(`[Cron:Reminder] Sent ${sent} advance reminders`);
        }
        catch (err) {
            console.error('[Cron:Reminder] Error:', err);
        }
    });
    console.log(`[Cron:Reminder] Scheduled: ${schedule}`);
};
/**
 * JOB 4 — Overdue Task Marker
 * Runs daily. Marks pending tasks that are 2+ hours past scheduled time as 'missed'.
 */
const startOverdueMarkerJob = () => {
    const schedule = env.TASK_OVERDUE_CRON;
    if (!cron.validate(schedule)) {
        console.error(`[Cron] Invalid TASK_OVERDUE_CRON: "${schedule}"`);
        return;
    }
    cron.schedule(schedule, async () => {
        try {
            const missed = await markOverdueTasks();
            if (missed > 0)
                console.log(`[Cron:Overdue] Marked ${missed} tasks as missed`);
        }
        catch (err) {
            console.error('[Cron:Overdue] Error:', err);
        }
    });
    console.log(`[Cron:Overdue] Scheduled: ${schedule}`);
};
/**
 * Start all background jobs.
 */
const startAllCronJobs = () => {
    startTaskGeneratorJob();
    startDueNotifierJob();
    startAdvanceReminderJob();
    startOverdueMarkerJob();
};
export default startAllCronJobs;
