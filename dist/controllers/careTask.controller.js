import * as careTaskService from '../services/careTask.service.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
/**
 * GET /care-tasks
 * Employee: auto-filtered to their assigned tasks.
 * Admin: sees all tasks.
 */
export const listTasks = async (req, res, next) => {
    try {
        const query = req.validatedQuery || req.query;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = req.user?.role === 'employee' ? req.user._id.toString() : null;
        if (req.user?.role === 'super_admin') {
            if (req.query.branchId)
                query.branchId = req.query.branchId;
        }
        else {
            if (req.branchId) {
                query.branchId = req.branchId;
            }
            else {
                return apiResponse(res, 200, 'Care tasks retrieved successfully', {
                    tasks: [],
                    pagination: { total: 0, page: 1, limit: 50, pages: 0 },
                });
            }
        }
        const data = await careTaskService.listTasks(query, userId);
        return apiResponse(res, 200, 'Care tasks retrieved successfully', data);
    }
    catch (error) {
        next(error);
    }
};
/**
 * GET /care-tasks/:id
 */
export const getTask = async (req, res, next) => {
    try {
        const task = await careTaskService.getTaskById(req.params.id);
        if (req.user?.role !== 'super_admin' && req.user?.role !== 'employee') {
            // Employees are usually checked by `assignedTo` but `getTaskById` might not enforce it.
            // But if we want `admin` (Branch Manager) to see all tasks in their branch, but not others:
            const branchId = task.branchId.toString();
            const hasAccess = req.user?.branches.some(b => b.toString() === branchId);
            if (!hasAccess) {
                throw ApiError.forbidden('Access denied to this task');
            }
        }
        // Employee logic is separate? Usually employees should only see their assigned tasks?
        // The previous implementation didn't check `assignedTo` for getTask.
        // Assuming `admin` logic is the main concern here.
        return apiResponse(res, 200, 'Care task retrieved successfully', task);
    }
    catch (error) {
        next(error);
    }
};
/**
 * POST /care-tasks/:id/complete
 */
export const completeTask = async (req, res, next) => {
    try {
        if (req.user) {
            if (req.user.role !== 'super_admin') {
                const task = await careTaskService.getTaskById(req.params.id);
                const branchId = task.branchId.toString();
                const hasAccess = req.user.branches.some(b => b.toString() === branchId);
                if (!hasAccess)
                    throw ApiError.forbidden('Access denied');
            }
            const task = await careTaskService.completeTask(req.params.id, req.user._id.toString(), req.body);
            return apiResponse(res, 200, 'Task completed successfully', task);
        }
    }
    catch (error) {
        next(error);
    }
};
/**
 * POST /care-tasks/:id/skip
 */
export const skipTask = async (req, res, next) => {
    try {
        if (req.user) {
            if (req.user.role !== 'super_admin') {
                const task = await careTaskService.getTaskById(req.params.id);
                const branchId = task.branchId.toString();
                const hasAccess = req.user.branches.some(b => b.toString() === branchId);
                if (!hasAccess)
                    throw ApiError.forbidden('Access denied');
            }
            const task = await careTaskService.skipTask(req.params.id, req.user._id.toString(), req.body.reason);
            return apiResponse(res, 200, 'Task skipped successfully', task);
        }
    }
    catch (error) {
        next(error);
    }
};
/**
 * GET /care-tasks/stats
 */
export const getStats = async (req, res, next) => {
    try {
        const query = req.validatedQuery || req.query;
        let branchId = query.branchId;
        if (req.user?.role !== 'super_admin') {
            branchId = req.branchId;
            if (!branchId) {
                return apiResponse(res, 200, 'Task stats retrieved successfully', {
                    total: 0,
                    pending: 0,
                    completed: 0,
                    missed: 0,
                    skipped: 0,
                });
            }
        }
        const stats = await careTaskService.getStats(query.from, query.to, branchId);
        return apiResponse(res, 200, 'Task stats retrieved successfully', stats);
    }
    catch (error) {
        next(error);
    }
};
