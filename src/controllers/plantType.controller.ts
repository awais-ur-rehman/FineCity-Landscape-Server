import { Request, Response, NextFunction } from 'express';
import PlantType from '../models/PlantType.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

export const listPlantTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plantTypes = await PlantType.find({ isActive: true });
    return apiResponse(res, 200, 'Plant types retrieved successfully', plantTypes);
  } catch (error) {
    next(error);
  }
};

export const getPlantType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plantType = await PlantType.findById(req.params.id);
    if (!plantType) {
      throw ApiError.notFound('Plant type not found');
    }
    return apiResponse(res, 200, 'Plant type retrieved successfully', plantType);
  } catch (error) {
    next(error);
  }
};

export const createPlantType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plantType = await PlantType.create(req.body);
    return apiResponse(res, 201, 'Plant type created successfully', plantType);
  } catch (error) {
    next(error);
  }
};

export const updatePlantType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plantType = await PlantType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!plantType) {
      throw ApiError.notFound('Plant type not found');
    }
    return apiResponse(res, 200, 'Plant type updated successfully', plantType);
  } catch (error) {
    next(error);
  }
};

export const deletePlantType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plantType = await PlantType.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!plantType) {
      throw ApiError.notFound('Plant type not found');
    }
    return apiResponse(res, 200, 'Plant type deactivated successfully');
  } catch (error) {
    next(error);
  }
};
