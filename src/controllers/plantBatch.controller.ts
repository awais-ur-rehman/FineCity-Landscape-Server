import { Request, Response, NextFunction } from 'express';
import * as plantBatchService from '../services/plantBatch.service.js';
import AuditLog from '../models/AuditLog.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { cloudinary, isConfigured } from '../config/cloudinary.js';

/**
 * GET /plant-batches
 * List plant batches with filters and pagination.
 */
export const listBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.validatedQuery || req.query;

    if (req.user?.role === 'super_admin') {
      if (req.query.branchId) query.branchId = req.query.branchId;
    } else {
      if (req.branchId) {
        query.branchId = req.branchId;
      } else {
        return apiResponse(res, 200, 'Plant batches retrieved successfully', {
          batches: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 0 },
        });
      }
    }

    const data = await plantBatchService.listBatches(query);
    return apiResponse(res, 200, 'Plant batches retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /plant-batches/:id
 * Get a single plant batch by ID.
 */
export const getBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await plantBatchService.getBatchById(req.params.id as string);

    if (req.user?.role !== 'super_admin') {
      const hasAccess = req.user?.branches.some((b) => b.toString() === batch.branchId.toString());
      if (!hasAccess) throw ApiError.forbidden('Access denied to this batch');
    }

    return apiResponse(res, 200, 'Plant batch retrieved successfully', batch);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /plant-batches
 * Create a new plant batch (admin only).
 */
export const createBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      if (req.user.role !== 'super_admin') {
        const hasAccess = req.user.branches.some((b) => b.toString() === req.body.branchId);
        if (!hasAccess) {
          throw ApiError.forbidden('Cannot create batch in a branch you do not manage');
        }
      }
      const batch = await plantBatchService.createBatch(req.body, req.user._id.toString());
      AuditLog.create({
        action: 'CREATE',
        entity: 'PlantBatch',
        entityId: (batch as { _id: unknown })._id?.toString() ?? '',
        performedBy: req.user._id,
        branchId: req.body.branchId,
        details: { name: req.body.name, quantity: req.body.quantity },
      }).catch(() => {});
      return apiResponse(res, 201, 'Plant batch created successfully', batch);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /plant-batches/:id
 * Update a plant batch (admin only).
 */
export const updateBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id.toString() ?? '';
    const batch = await plantBatchService.updateBatch(req.params.id as string, req.body, userId);
    AuditLog.create({
      action: 'UPDATE',
      entity: 'PlantBatch',
      entityId: req.params.id as string,
      performedBy: req.user!._id,
      branchId: (batch as unknown as { branchId?: { toString(): string } }).branchId?.toString(),
      details: { updatedFields: Object.keys(req.body) },
    }).catch(() => {});
    return apiResponse(res, 200, 'Plant batch updated successfully', batch);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /plant-batches/:id
 * Soft-delete a plant batch (admin only).
 */
export const deleteBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await plantBatchService.deleteBatch(req.params.id as string);
    AuditLog.create({
      action: 'DELETE',
      entity: 'PlantBatch',
      entityId: req.params.id as string,
      performedBy: req.user!._id,
      details: {},
    }).catch(() => {});
    return apiResponse(res, 200, 'Plant batch deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /plant-batches/upload-image
 * Upload a batch image to Cloudinary and return the URL + publicId.
 */
export const uploadBatchImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) throw ApiError.badRequest('No file uploaded');
    if (!isConfigured) throw ApiError.badRequest('Image upload not configured');

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'finecity/batches', resource_type: 'image' },
        (err, res) => (err ? reject(err) : resolve(res as { secure_url: string; public_id: string })),
      );
      stream.end(file.buffer);
    });

    return apiResponse(res, 200, 'Image uploaded', { url: result.secure_url, publicId: result.public_id });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /plant-batches/delete-image
 * Delete an image from Cloudinary by publicId.
 */
export const deleteBatchImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicId } = req.body as { publicId?: string };
    if (!publicId) throw ApiError.badRequest('publicId required');
    if (!isConfigured) return apiResponse(res, 200, 'Image service not configured');

    await cloudinary.uploader.destroy(publicId);
    return apiResponse(res, 200, 'Image deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /plant-batches/export
 * Export all batches for the branch as CSV (admin only).
 */
export const exportBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId =
      req.user?.role === 'super_admin'
        ? (req.query.branchId as string | undefined)
        : req.branchId;

    const csv = await plantBatchService.exportBatchesCsv(branchId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="plant-batches.csv"');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};
