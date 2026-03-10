import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

interface ListUsersQuery {
  role?: string;
  search?: string;
  page?: string;
  limit?: string;
}

/**
 * GET /users
 * List users with optional filters (admin only).
 */
export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query as unknown as ListUsersQuery;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { isActive: true };

    // Restrict Admin to their branches
    if (req.user?.role !== 'super_admin') {
      filter.branches = { $in: req.user?.branches };
    }

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-refreshToken')
        .populate('branches', 'name code')
        .populate('currentBranch', 'name code')
        .skip(skip)
        .limit(parseInt(limit, 10))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return apiResponse(res, 200, 'Users retrieved successfully', {
      users,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /users/me
 * Get current user profile.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!._id)
      .select('-refreshToken')
      .populate('branches', 'name code')
      .populate('currentBranch', 'name code');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return apiResponse(res, 200, 'Profile retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /users
 * Create a new employee (admin only).
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, phone, branches, currentBranch } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw ApiError.badRequest('A user with this email already exists');
    }

    if (req.user?.role !== 'super_admin') {
      const allowed = branches.every((b: string) => req.user?.branches.some(ub => ub.toString() === b));
      if (!allowed) {
        throw ApiError.forbidden('Cannot assign branches you do not manage');
      }
    }

    const user = await User.create({
      email,
      name,
      phone,
      branches,
      currentBranch,
      role: 'employee',
    });

    return apiResponse(res, 201, 'Employee created successfully', user.toJSON());
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /users/:id
 * Update a user (admin only).
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent role escalation
    delete updates.role;

    if (req.user?.role !== 'super_admin' && updates.branches) {
      const allowed = updates.branches.every((b: string) => req.user?.branches.some(ub => ub.toString() === b));
      if (!allowed) {
        throw ApiError.forbidden('Cannot assign branches you do not manage');
      }
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    })
      .select('-refreshToken')
      .populate('branches', 'name code')
      .populate('currentBranch', 'name code');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return apiResponse(res, 200, 'User updated successfully', user.toJSON());
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /users/me/branch
 * Switch active branch for the current user.
 */
export const switchBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.body;
    const userId = req.user!._id;

    // Verify user has access to this branch (unless admin)
    if (req.user!.role !== 'super_admin') {
      const hasAccess = req.user!.branches.some((b) => b.toString() === branchId);
      if (!hasAccess) {
        throw ApiError.forbidden('You do not have access to this branch');
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { currentBranch: branchId },
      { new: true }
    )
      .select('-refreshToken')
      .populate('branches', 'name code')
      .populate('currentBranch', 'name code');

    return apiResponse(res, 200, 'Branch switched successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /users/:id
 * Deactivate a user (soft delete, admin only).
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.role === 'super_admin') {
      throw ApiError.forbidden('Cannot deactivate a super admin user');
    }

    if (user.role === 'admin' && req.user!.role !== 'super_admin') {
      throw ApiError.forbidden('Only super admins can deactivate admins');
    }

    user.isActive = false;
    user.refreshToken = null;
    await user.save();

    return apiResponse(res, 200, 'User deactivated successfully');
  } catch (error) {
    next(error);
  }
};
