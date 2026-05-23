import { Request, Response, NextFunction } from 'express';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

export const listBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (parseInt(page, 10) - 1) * safeLimit;

    const filter: Record<string, unknown> = { isActive: true };

    // Admin can only see their own branches; super_admin sees all
    if (req.user?.role !== 'super_admin') {
      filter._id = { $in: req.user?.branches ?? [] };
    }

    const [branches, total] = await Promise.all([
      Branch.find(filter).skip(skip).limit(safeLimit).sort({ name: 1 }),
      Branch.countDocuments(filter),
    ]);

    return apiResponse(res, 200, 'Branches retrieved successfully', {
      branches,
      pagination: {
        page: parseInt(page, 10),
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) throw ApiError.notFound('Branch not found');

    // Admin can only access their own branches
    if (req.user?.role !== 'super_admin') {
      const hasAccess = req.user?.branches.some((b) => b.toString() === branch._id.toString());
      if (!hasAccess) throw ApiError.forbidden('Access denied to this branch');
    }

    return apiResponse(res, 200, 'Branch retrieved successfully', branch);
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await Branch.create({ ...req.body, createdBy: req.user!._id });

    // Auto-assign the new branch to the super_admin who created it
    await User.findByIdAndUpdate(req.user!._id, {
      $addToSet: { branches: branch._id },
    });

    return apiResponse(res, 201, 'Branch created successfully', branch);
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!branch) throw ApiError.notFound('Branch not found');
    return apiResponse(res, 200, 'Branch updated successfully', branch);
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!branch) throw ApiError.notFound('Branch not found');
    return apiResponse(res, 200, 'Branch deactivated successfully');
  } catch (error) {
    next(error);
  }
};
