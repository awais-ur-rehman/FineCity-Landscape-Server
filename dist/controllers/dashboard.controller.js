import * as dashboardService from '../services/dashboard.service.js';
import apiResponse from '../utils/apiResponse.js';
const getBranchId = (req) => {
    if (req.user?.role === 'super_admin' && req.query.branchId) {
        return req.query.branchId;
    }
    return req.branchId;
};
export const getSummary = async (req, res, next) => {
    try {
        const branchId = getBranchId(req);
        const summary = await dashboardService.getSummary(branchId);
        return apiResponse(res, 200, 'Dashboard summary retrieved', summary);
    }
    catch (error) {
        next(error);
    }
};
export const getStats = async (req, res, next) => {
    try {
        const branchId = getBranchId(req);
        const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const to = req.query.to ? new Date(req.query.to) : new Date();
        const stats = await dashboardService.getTasksByStatus(from, to, branchId);
        return apiResponse(res, 200, 'Task statistics retrieved', stats);
    }
    catch (error) {
        next(error);
    }
};
export const getLeaderboard = async (req, res, next) => {
    try {
        const branchId = getBranchId(req);
        const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const to = req.query.to ? new Date(req.query.to) : new Date();
        const leaderboard = await dashboardService.getUserPerformance(from, to, branchId);
        return apiResponse(res, 200, 'Leaderboard retrieved', leaderboard);
    }
    catch (error) {
        next(error);
    }
};
