import { Request, Response, NextFunction } from 'express';
import * as fertilizerService from '../services/fertilizer.service.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

export const listFertilizers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, search, isActive, page, limit } = req.query;

    // Non-super_admin always scoped to their current branch — cannot query other branches
    const branchId =
      req.user?.role === 'super_admin'
        ? (req.query.branchId as string | undefined)
        : req.branchId;

    const result = await fertilizerService.listFertilizers({
      branchId,
      type: type as string,
      search: search as string,
      isActive: isActive ? isActive === 'true' : undefined,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    return apiResponse(res, 200, 'Fertilizers retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getFertilizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fertilizer = await fertilizerService.getFertilizerById(req.params.id as string);
    return apiResponse(res, 200, 'Fertilizer details', fertilizer);
  } catch (error) {
    next(error);
  }
};

export const createFertilizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');
    const fertilizer = await fertilizerService.createFertilizer(
      req.body,
      req.user._id.toString(),
      req.branchId as string,
    );
    return apiResponse(res, 201, 'Fertilizer created successfully', fertilizer);
  } catch (error) {
    next(error);
  }
};

export const updateFertilizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');
    const fertilizer = await fertilizerService.updateFertilizer(
      req.params.id as string,
      req.body,
      req.user.branches.map((b) => b.toString()),
      req.user.role === 'super_admin',
    );
    return apiResponse(res, 200, 'Fertilizer updated successfully', fertilizer);
  } catch (error) {
    next(error);
  }
};

export const deleteFertilizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');
    await fertilizerService.deleteFertilizer(
      req.params.id as string,
      req.user.branches.map((b) => b.toString()),
      req.user.role === 'super_admin',
    );
    return apiResponse(res, 200, 'Fertilizer deleted successfully');
  } catch (error) {
    next(error);
  }
};
