import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/apiError.js';

const rbac = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
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
