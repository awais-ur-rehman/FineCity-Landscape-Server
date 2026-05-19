import { Request, Response, NextFunction } from 'express';
import * as careTaskService from '../services/careTask.service.js';
import { uploadPhotosToCloudinary } from '../middleware/upload.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import AuditLog from '../models/AuditLog.js';

/**
 * GET /care-tasks
 * Employee: auto-filtered to their assigned tasks.
 * Admin: sees all tasks.
 */
export const listTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.validatedQuery || req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = req.user?.role === 'employee' ? req.user._id.toString() : null;

    if (req.user?.role === 'super_admin') {
      if (req.query.branchId) query.branchId = req.query.branchId;
    } else {
      if (req.branchId) {
        query.branchId = req.branchId;
      } else {
        return apiResponse(res, 200, 'Care tasks retrieved successfully', {
          tasks: [],
          pagination: { total: 0, page: 1, limit: 50, pages: 0 },
        });
      }
    }

    const data = await careTaskService.listTasks(query, userId);
    return apiResponse(res, 200, 'Care tasks retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /care-tasks/:id
 */
export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await careTaskService.getTaskById(req.params.id as string);
    const role = req.user?.role;
    const userId = req.user?._id.toString();

    if (role === 'employee') {
      // Employees may only view tasks assigned to them
      const isAssigned = task.assignedTo.some((u) => u._id?.toString() === userId);
      if (!isAssigned) throw ApiError.forbidden('Access denied to this task');
    } else if (role === 'admin') {
      const hasAccess = req.user?.branches.some((b) => b.toString() === task.branchId.toString());
      if (!hasAccess) throw ApiError.forbidden('Access denied to this task');
    }
    // super_admin: unrestricted

    return apiResponse(res, 200, 'Care task retrieved successfully', task);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /care-tasks/:id/complete
 * Accepts multipart/form-data OR JSON.
 * Optional `photos` field: up to 3 image files.
 * Text fields: notes, completedAt, fertilizerUsages (JSON string when multipart).
 */
export const completeTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?._id.toString();

    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const task = await careTaskService.getTaskById(id);

    // Verify branch access
    if (req.user?.role !== 'super_admin') {
      const branchId = task.branchId.toString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasAccess = req.user?.branches.some((b: any) => b.toString() === branchId);
      if (!hasAccess) {
        throw ApiError.forbidden('Access denied to this task');
      }
    }

    // Parse body — handles both JSON and multipart text fields
    const notes: string | undefined = req.body.notes;
    const completedAt: string | undefined = req.body.completedAt;

    // fertilizerUsages arrives as a JSON string when sent via multipart
    let fertilizerUsages: unknown[] | undefined;
    if (req.body.fertilizerUsages) {
      try {
        fertilizerUsages =
          typeof req.body.fertilizerUsages === 'string'
            ? JSON.parse(req.body.fertilizerUsages)
            : req.body.fertilizerUsages;
      } catch {
        throw ApiError.badRequest('fertilizerUsages must be a valid JSON array');
      }
    }

    // Upload any attached photos to Cloudinary
    const files = (req.files as Express.Multer.File[]) ?? [];
    const photoUrls = await uploadPhotosToCloudinary(files, id);

    const updatedTask = await careTaskService.completeTask(id, userId, req.user!.role, {
      notes,
      completedAt: completedAt ? new Date(completedAt) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fertilizerUsages: fertilizerUsages as any,
      photoUrls,
    });

    AuditLog.create({
      action: 'COMPLETE',
      entity: 'CareTask',
      entityId: id,
      performedBy: req.user!._id,
      branchId: task.branchId,
      details: { notes: notes ?? null, photoCount: photoUrls.length },
    }).catch(() => {});

    return apiResponse(res, 200, 'Task completed successfully', updatedTask);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /care-tasks/:id/skip
 */
export const skipTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      if (req.user.role !== 'super_admin') {
        const task = await careTaskService.getTaskById(req.params.id as string);
        const branchId = task.branchId.toString();
        const hasAccess = req.user.branches.some(b => b.toString() === branchId);
        if (!hasAccess) throw ApiError.forbidden('Access denied');
      }
      const task = await careTaskService.skipTask(req.params.id as string, req.user._id.toString(), req.body.reason);
      AuditLog.create({
        action: 'SKIP',
        entity: 'CareTask',
        entityId: req.params.id,
        performedBy: req.user._id,
        branchId: task.branchId,
        details: { reason: req.body.reason },
      }).catch(() => {});
      return apiResponse(res, 200, 'Task skipped successfully', task);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /care-tasks/export
 * Admin only — stream tasks as CSV.
 */
export const exportTasksCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.validatedQuery || req.query;
    const branchId = req.user?.role === 'super_admin' ? query.branchId : req.branchId;

    const csv = await careTaskService.exportTasksCsv(query.from, query.to, branchId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="care-tasks.csv"');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /care-tasks/fertilizer-usage
 * Admin only — paginated fertilizer usage history.
 */
export const getFertilizerUsageHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.validatedQuery || req.query;

    if (req.user?.role !== 'super_admin') {
      if (!req.branchId) {
        return apiResponse(res, 200, 'Fertilizer usage history retrieved', {
          records: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 0 },
        });
      }
      query.branchId = req.branchId;
    }

    const data = await careTaskService.getFertilizerUsageHistory(query);
    return apiResponse(res, 200, 'Fertilizer usage history retrieved', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /care-tasks/stats
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.validatedQuery || req.query;

    let branchId = query.branchId;
    if (req.user?.role !== 'super_admin') {
      branchId = req.branchId;
      if (!branchId) {
        return apiResponse(res, 200, 'Task stats retrieved successfully', {
          total: 0,
          pending: 0,
          completed: 0,
          missed: 0,
          skipped: 0,
        });
      }
    }

    const stats = await careTaskService.getStats(query.from, query.to, branchId);
    return apiResponse(res, 200, 'Task stats retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};
