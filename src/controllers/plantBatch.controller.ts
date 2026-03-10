import { Request, Response, NextFunction } from 'express';
import * as plantBatchService from '../services/plantBatch.service.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

/**
 * GET /plant-batches
 * List plant batches with filters and pagination.
 */
export const listBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.validatedQuery || req.query;

    if (req.user?.role === 'super_admin') {
      if (req.query.branchId) query.branchId = req.query.branchId;
    } else {
      if (req.branchId) {
        query.branchId = req.branchId;
      } else {
        return apiResponse(res, 200, 'Plant batches retrieved successfully', {
          batches: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 0 },
        });
      }
    }

    const data = await plantBatchService.listBatches(query);
    return apiResponse(res, 200, 'Plant batches retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /plant-batches/:id
 * Get a single plant batch by ID.
 */
export const getBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await plantBatchService.getBatchById(req.params.id as string);
    return apiResponse(res, 200, 'Plant batch retrieved successfully', batch);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /plant-batches
 * Create a new plant batch (admin only).
 */
export const createBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      if (req.user.role !== 'super_admin') {
        const hasAccess = req.user.branches.some((b) => b.toString() === req.body.branchId);
        if (!hasAccess) {
          throw ApiError.forbidden('Cannot create batch in a branch you do not manage');
        }
      }
      const batch = await plantBatchService.createBatch(req.body, req.user._id.toString());
      return apiResponse(res, 201, 'Plant batch created successfully', batch);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /plant-batches/:id
 * Update a plant batch (admin only).
 */
export const updateBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await plantBatchService.updateBatch(req.params.id as string, req.body);
    return apiResponse(res, 200, 'Plant batch updated successfully', batch);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /plant-batches/:id
 * Soft-delete a plant batch (admin only).
 */
export const deleteBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await plantBatchService.deleteBatch(req.params.id as string);
    return apiResponse(res, 200, 'Plant batch deleted successfully');
  } catch (error) {
    next(error);
  }
};
