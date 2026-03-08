import { Request, Response, NextFunction } from 'express';
import Category from '../models/Category.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

export const listCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ isActive: true });
    return apiResponse(res, 200, 'Categories retrieved successfully', categories);
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    return apiResponse(res, 200, 'Category retrieved successfully', category);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.create(req.body);
    return apiResponse(res, 201, 'Category created successfully', category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    return apiResponse(res, 200, 'Category updated successfully', category);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    return apiResponse(res, 200, 'Category deactivated successfully');
  } catch (error) {
    next(error);
  }
};
