import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import auth from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/summary', dashboardController.getSummary);
router.get('/stats', dashboardController.getStats);
router.get('/leaderboard', dashboardController.getLeaderboard);

export default router;
