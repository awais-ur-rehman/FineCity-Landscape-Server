import * as careTaskService from '../services/careTask.service.js';
import apiResponse from '../utils/apiResponse.js';

/**
 * GET /care-tasks
 * Employee: auto-filtered to their assigned tasks.
 * Admin: sees all tasks.
 */
export const listTasks = async (req, res, next) => {
  try {
    const query = req.validatedQuery || req.query;
    const userId = req.user.role === 'employee' ? req.user._id : null;
    const data = await careTaskService.listTasks(query, userId);
    return apiResponse(res, 200, 'Care tasks retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /care-tasks/:id
 */
export const getTask = async (req, res, next) => {
  try {
    const task = await careTaskService.getTaskById(req.params.id);
    return apiResponse(res, 200, 'Care task retrieved successfully', task);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /care-tasks/:id/complete
 */
export const completeTask = async (req, res, next) => {
  try {
    const task = await careTaskService.completeTask(req.params.id, req.user._id, req.body);
    return apiResponse(res, 200, 'Task completed successfully', task);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /care-tasks/:id/skip
 */
export const skipTask = async (req, res, next) => {
  try {
    const task = await careTaskService.skipTask(req.params.id, req.user._id, req.body.reason);
    return apiResponse(res, 200, 'Task skipped successfully', task);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /care-tasks/stats
 */
export const getStats = async (req, res, next) => {
  try {
    const query = req.validatedQuery || req.query;
    const stats = await careTaskService.getStats(query.from, query.to);
    return apiResponse(res, 200, 'Task stats retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};
