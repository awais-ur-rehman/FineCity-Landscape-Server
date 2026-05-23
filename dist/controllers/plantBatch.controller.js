import * as plantBatchService from '../services/plantBatch.service.js';
import AuditLog from '../models/AuditLog.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { cloudinary, isConfigured } from '../config/cloudinary.js';
/**
 * GET /plant-batches
 * List plant batches with filters and pagination.
 */
export const listBatches = async (req, res, next) => {
    try {
        const query = req.validatedQuery || req.query;
        if (req.user?.role === 'super_admin') {
            if (req.query.branchId)
                query.branchId = req.query.branchId;
        }
        else {
            if (req.branchId) {
                query.branchId = req.branchId;
            }
            else {
                return apiResponse(res, 200, 'Plant batches retrieved successfully', {
                    batches: [],
                    pagination: { total: 0, page: 1, limit: 20, pages: 0 },
                });
            }
        }
        const data = await plantBatchService.listBatches(query);
        return apiResponse(res, 200, 'Plant batches retrieved successfully', data);
    }
    catch (error) {
        next(error);
    }
};
/**
 * GET /plant-batches/:id
 * Get a single plant batch by ID.
 */
export const getBatch = async (req, res, next) => {
    try {
        const batch = await plantBatchService.getBatchById(req.params.id);
        if (req.user?.role !== 'super_admin') {
            const hasAccess = req.user?.branches.some((b) => b.toString() === batch.branchId.toString());
            if (!hasAccess)
                throw ApiError.forbidden('Access denied to this batch');
        }
        return apiResponse(res, 200, 'Plant batch retrieved successfully', batch);
    }
    catch (error) {
        next(error);
    }
};
/**
 * POST /plant-batches
 * Create a new plant batch (admin only).
 */
export const createBatch = async (req, res, next) => {
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
                entityId: batch._id?.toString() ?? '',
                performedBy: req.user._id,
                branchId: req.body.branchId,
                details: { name: req.body.name, quantity: req.body.quantity },
            }).catch(() => { });
            return apiResponse(res, 201, 'Plant batch created successfully', batch);
        }
    }
    catch (error) {
        next(error);
    }
};
/**
 * PUT /plant-batches/:id
 * Update a plant batch (admin only).
 */
export const updateBatch = async (req, res, next) => {
    try {
        const userId = req.user?._id.toString() ?? '';
        const batch = await plantBatchService.updateBatch(req.params.id, req.body, userId);
        AuditLog.create({
            action: 'UPDATE',
            entity: 'PlantBatch',
            entityId: req.params.id,
            performedBy: req.user._id,
            branchId: batch.branchId?.toString(),
            details: { updatedFields: Object.keys(req.body) },
        }).catch(() => { });
        return apiResponse(res, 200, 'Plant batch updated successfully', batch);
    }
    catch (error) {
        next(error);
    }
};
/**
 * DELETE /plant-batches/:id
 * Soft-delete a plant batch (admin only).
 */
export const deleteBatch = async (req, res, next) => {
    try {
        await plantBatchService.deleteBatch(req.params.id);
        AuditLog.create({
            action: 'DELETE',
            entity: 'PlantBatch',
            entityId: req.params.id,
            performedBy: req.user._id,
            details: {},
        }).catch(() => { });
        return apiResponse(res, 200, 'Plant batch deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
/**
 * POST /plant-batches/upload-image
 * Upload a batch image to Cloudinary and return the URL + publicId.
 */
export const uploadBatchImage = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file)
            throw ApiError.badRequest('No file uploaded');
        if (!isConfigured)
            throw ApiError.badRequest('Image upload not configured');
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'finecity/batches', resource_type: 'image' }, (err, res) => (err ? reject(err) : resolve(res)));
            stream.end(file.buffer);
        });
        return apiResponse(res, 200, 'Image uploaded', { url: result.secure_url, publicId: result.public_id });
    }
    catch (error) {
        next(error);
    }
};
/**
 * DELETE /plant-batches/delete-image
 * Delete an image from Cloudinary by publicId.
 */
export const deleteBatchImage = async (req, res, next) => {
    try {
        const { publicId } = req.body;
        if (!publicId)
            throw ApiError.badRequest('publicId required');
        if (!isConfigured)
            return apiResponse(res, 200, 'Image service not configured');
        await cloudinary.uploader.destroy(publicId);
        return apiResponse(res, 200, 'Image deleted');
    }
    catch (error) {
        next(error);
    }
};
/**
 * GET /plant-batches/export
 * Export all batches for the branch as CSV (admin only).
 */
export const exportBatches = async (req, res, next) => {
    try {
        const branchId = req.user?.role === 'super_admin'
            ? req.query.branchId
            : req.branchId;
        const csv = await plantBatchService.exportBatchesCsv(branchId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="plant-batches.csv"');
        return res.send(csv);
    }
    catch (error) {
        next(error);
    }
};
