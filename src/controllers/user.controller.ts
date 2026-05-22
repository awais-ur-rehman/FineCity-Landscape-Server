import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
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
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (parseInt(page, 10) - 1) * safeLimit;

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
        .populate('branches', 'name code')
        .populate('currentBranch', 'name code')
        .skip(skip)
        .limit(safeLimit)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return apiResponse(res, 200, 'Users retrieved successfully', {
      users,
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
    const { email, name, phone, password, branches, currentBranch, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw ApiError.badRequest('A user with this email already exists');
    }

    // Admins can only create employees; only super_admin can create admins
    const assignedRole = req.user?.role === 'super_admin' ? (role || 'employee') : 'employee';
    if (assignedRole === 'super_admin') {
      throw ApiError.forbidden('Cannot create super_admin accounts');
    }

    // branch_manager must assign at least one branch they manage
    if (req.user?.role === 'branch_manager') {
      if (!branches?.length) {
        throw ApiError.badRequest('You must assign at least one branch when creating a user');
      }
      const allowed = branches.every((b: string) => req.user?.branches.some(ub => ub.toString() === b));
      if (!allowed) {
        throw ApiError.forbidden('Cannot assign branches you do not manage');
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      name,
      phone,
      passwordHash,
      branches: branches || [],
      currentBranch,
      role: assignedRole,
    });

    AuditLog.create({
      action: 'CREATE',
      entity: 'User',
      entityId: user._id.toString(),
      performedBy: req.user!._id,
      branchId: (branches?.[0]) ?? req.user?.branches?.[0],
      details: { name, email, role: assignedRole },
    }).catch(() => {});

    return apiResponse(res, 201, 'User created successfully', user.toJSON());
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
    const id = req.params.id as string;
    const updates = req.body;

    // Prevent role escalation
    delete updates.role;

    const target = await User.findById(id);
    if (!target) throw ApiError.notFound('User not found');

    // Non-super_admin can only update users who share at least one branch with them
    if (req.user?.role !== 'super_admin') {
      const sharedBranch = target.branches.some((b) =>
        req.user?.branches.some((ub) => ub.toString() === b.toString()),
      );
      if (!sharedBranch) throw ApiError.forbidden('Access denied to this user');

      if (updates.branches) {
        const allowed = updates.branches.every((b: string) =>
          req.user?.branches.some((ub) => ub.toString() === b),
        );
        if (!allowed) throw ApiError.forbidden('Cannot assign branches you do not manage');
      }
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate('branches', 'name code')
      .populate('currentBranch', 'name code');

    if (!user) throw ApiError.notFound('User not found');

    AuditLog.create({
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      performedBy: req.user!._id,
      branchId: user.branches?.[0] ?? req.user?.branches?.[0],
      details: { updatedFields: Object.keys(updates) },
    }).catch(() => {});

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
    const user = await User.findById(req.params.id as string);
    if (!user) throw ApiError.notFound('User not found');

    if (user.role === 'super_admin') {
      throw ApiError.forbidden('Cannot deactivate a super admin user');
    }

    if (user.role === 'branch_manager' && req.user!.role !== 'super_admin') {
      throw ApiError.forbidden('Only super admins can deactivate branch managers');
    }

    // Non-super_admin can only deactivate users who share a branch
    if (req.user?.role !== 'super_admin') {
      const sharedBranch = user.branches.some((b) =>
        req.user?.branches.some((ub) => ub.toString() === b.toString()),
      );
      if (!sharedBranch) throw ApiError.forbidden('Access denied to this user');
    }

    user.isActive = false;
    user.refreshToken = undefined;
    await user.save();

    AuditLog.create({
      action: 'DELETE',
      entity: 'User',
      entityId: user._id.toString(),
      performedBy: req.user!._id,
      branchId: user.branches?.[0] ?? req.user?.branches?.[0],
      details: { name: user.name, email: user.email },
    }).catch(() => {});

    return apiResponse(res, 200, 'User deactivated successfully');
  } catch (error) {
    next(error);
  }
};
