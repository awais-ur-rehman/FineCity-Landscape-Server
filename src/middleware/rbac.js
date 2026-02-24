import ApiError from '../utils/apiError.js';

/**
 * Role-based access control middleware.
 * Usage: rbac('admin') or rbac('admin', 'employee')
 * @param {...string} allowedRoles - Roles that may access the route
 * @returns {import('express').RequestHandler}
 */
const rbac = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }

    next();
  };
};

export default rbac;
