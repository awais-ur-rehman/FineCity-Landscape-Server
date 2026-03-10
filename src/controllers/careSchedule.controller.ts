import { Request, Response, NextFunction } from 'express';
import * as careScheduleService from '../services/careSchedule.service.js';
import apiResponse from '../utils/apiResponse.js';
import PlantBatch from '../models/PlantBatch.js';
import ApiError from '../utils/apiError.js';

/**
 * GET /care-schedules
 */
export const listSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.validatedQuery || req.query;

    if (req.user?.role === 'super_admin') {
      if (req.query.branchId) query.branchId = req.query.branchId;
    } else {
      if (req.branchId) {
        query.branchId = req.branchId;
      } else {
        return apiResponse(res, 200, 'Care schedules retrieved successfully', {
          schedules: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 0 },
        });
      }
    }

    const data = await careScheduleService.listSchedules(query);
    return apiResponse(res, 200, 'Care schedules retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /care-schedules/:id
 */
export const getSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedule = await careScheduleService.getScheduleById(req.params.id as string);
    return apiResponse(res, 200, 'Care schedule retrieved successfully', schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /care-schedules
 */
export const createSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      if (req.user.role !== 'super_admin') {
        const batch = await PlantBatch.findById(req.body.batchId);
        if (!batch) {
          throw ApiError.notFound('Plant batch not found');
        }
        const hasAccess = req.user.branches.some((b) => b.toString() === batch.branchId.toString());
        if (!hasAccess) {
          throw ApiError.forbidden('Cannot create schedule for a batch you do not manage');
        }
      }
      const schedule = await careScheduleService.createSchedule(req.body, req.user._id.toString());
      return apiResponse(res, 201, 'Care schedule created successfully', schedule);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /care-schedules/:id
 */
export const updateSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedule = await careScheduleService.updateSchedule(req.params.id as string, req.body);
    return apiResponse(res, 200, 'Care schedule updated successfully', schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /care-schedules/:id
 */
export const deleteSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await careScheduleService.deleteSchedule(req.params.id as string);
    return apiResponse(res, 200, 'Care schedule deactivated successfully');
  } catch (error) {
    next(error);
  }
};
