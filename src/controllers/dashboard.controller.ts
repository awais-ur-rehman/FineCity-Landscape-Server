import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service.js';
import apiResponse from '../utils/apiResponse.js';

const getBranchId = (req: Request): string | undefined => {
  if (req.user?.role === 'super_admin' && req.query.branchId) {
    return req.query.branchId as string;
  }
  return req.branchId;
};

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = getBranchId(req);
    const summary = await dashboardService.getSummary(branchId);
    return apiResponse(res, 200, 'Dashboard summary retrieved', summary);
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = getBranchId(req);
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const stats = await dashboardService.getTasksByStatus(from, to, branchId);
    return apiResponse(res, 200, 'Task statistics retrieved', stats);
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = getBranchId(req);
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const leaderboard = await dashboardService.getUserPerformance(from, to, branchId);
    return apiResponse(res, 200, 'Leaderboard retrieved', leaderboard);
  } catch (error) {
    next(error);
  }
};
