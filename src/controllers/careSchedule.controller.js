import * as careScheduleService from '../services/careSchedule.service.js';
import apiResponse from '../utils/apiResponse.js';

/**
 * GET /care-schedules
 */
export const listSchedules = async (req, res, next) => {
  try {
    const data = await careScheduleService.listSchedules(req.validatedQuery || req.query);
    return apiResponse(res, 200, 'Care schedules retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /care-schedules/:id
 */
export const getSchedule = async (req, res, next) => {
  try {
    const schedule = await careScheduleService.getScheduleById(req.params.id);
    return apiResponse(res, 200, 'Care schedule retrieved successfully', schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /care-schedules
 */
export const createSchedule = async (req, res, next) => {
  try {
    const schedule = await careScheduleService.createSchedule(req.body, req.user._id);
    return apiResponse(res, 201, 'Care schedule created successfully', schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /care-schedules/:id
 */
export const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await careScheduleService.updateSchedule(req.params.id, req.body);
    return apiResponse(res, 200, 'Care schedule updated successfully', schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /care-schedules/:id
 */
export const deleteSchedule = async (req, res, next) => {
  try {
    await careScheduleService.deleteSchedule(req.params.id);
    return apiResponse(res, 200, 'Care schedule deactivated successfully');
  } catch (error) {
    next(error);
  }
};
