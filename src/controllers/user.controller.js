import User from '../models/User.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

/**
 * GET /users
 * List users with optional filters (admin only).
 */
export const listUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const filter = { isActive: true };

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
 * POST /users
 * Create a new employee (admin only).
 */
export const createUser = async (req, res, next) => {
  try {
    const { email, name, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw ApiError.badRequest('A user with this email already exists');
    }

    const user = await User.create({
      email,
      name,
      phone,
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
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent role escalation
    delete updates.role;

    const user = await User.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).select('-refreshToken');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return apiResponse(res, 200, 'User updated successfully', user.toJSON());
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /users/:id
 * Deactivate a user (soft delete, admin only).
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.role === 'admin') {
      throw ApiError.forbidden('Cannot deactivate an admin user');
    }

    user.isActive = false;
    user.refreshToken = null;
    await user.save();

    return apiResponse(res, 200, 'User deactivated successfully');
  } catch (error) {
    next(error);
  }
};
