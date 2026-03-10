import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import env from '../config/env.js';
const auth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            throw ApiError.unauthorized('No token provided');
        }
        const token = header.split(' ')[1];
        let payload;
        try {
            payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
        }
        catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw ApiError.unauthorized('Token expired');
            }
            throw ApiError.unauthorized('Invalid token');
        }
        const user = await User.findById(payload.userId).select('-refreshToken');
        if (!user) {
            throw ApiError.unauthorized('User not found');
        }
        if (!user.isActive) {
            throw ApiError.forbidden('Account deactivated');
        }
        req.user = user;
        // Branch Context Logic
        const branchHeader = req.headers['x-branch-id'];
        let branchId = branchHeader;
        if (!branchId && user.currentBranch) {
            branchId = user.currentBranch.toString();
        }
        // If still no branch, default to the first assigned branch for employees
        if (!branchId && user.branches && user.branches.length > 0) {
            branchId = user.branches[0].toString();
        }
        if (branchId) {
            // For employees and branch admins, verify access
            if (user.role !== 'super_admin') {
                const hasAccess = user.branches.some((b) => b.toString() === branchId);
                if (!hasAccess) {
                    throw ApiError.forbidden('Access denied to this branch');
                }
            }
            req.branchId = branchId;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
export default auth;
