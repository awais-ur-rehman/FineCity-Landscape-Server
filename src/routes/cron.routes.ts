import { Router, Request, Response } from 'express';
import {
  generateTasks,
  notifyDueTasks,
  sendAdvanceReminders,
  markOverdueTasks,
} from '../services/taskGenerator.service.js';

const router = Router();

const verifyCronSecret = (req: Request, res: Response): boolean => {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers['x-cron-secret'] ?? req.query.secret;
  if (!secret || provided !== secret) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return false;
  }
  return true;
};

router.post('/generate-tasks', async (req: Request, res: Response) => {
  if (!verifyCronSecret(req, res)) return;
  const result = await generateTasks();
  res.json({ success: true, data: result });
});

router.post('/notify-due', async (req: Request, res: Response) => {
  if (!verifyCronSecret(req, res)) return;
  const sent = await notifyDueTasks();
  res.json({ success: true, data: { sent } });
});

router.post('/send-reminders', async (req: Request, res: Response) => {
  if (!verifyCronSecret(req, res)) return;
  const sent = await sendAdvanceReminders();
  res.json({ success: true, data: { sent } });
});

router.post('/mark-overdue', async (req: Request, res: Response) => {
  if (!verifyCronSecret(req, res)) return;
  const missed = await markOverdueTasks();
  res.json({ success: true, data: { missed } });
});

export default router;
