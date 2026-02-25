import * as plantBatchService from '../services/plantBatch.service.js';
import apiResponse from '../utils/apiResponse.js';

/**
 * GET /plant-batches
 * List plant batches with filters and pagination.
 */
export const listBatches = async (req, res, next) => {
  try {
    const data = await plantBatchService.listBatches(req.validatedQuery || req.query);
    return apiResponse(res, 200, 'Plant batches retrieved successfully', data);
  } catch (error) {
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
    return apiResponse(res, 200, 'Plant batch retrieved successfully', batch);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /plant-batches
 * Create a new plant batch (admin only).
 */
export const createBatch = async (req, res, next) => {
  try {
    const batch = await plantBatchService.createBatch(req.body, req.user._id);
    return apiResponse(res, 201, 'Plant batch created successfully', batch);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /plant-batches/:id
 * Update a plant batch (admin only).
 */
export const updateBatch = async (req, res, next) => {
  try {
    const batch = await plantBatchService.updateBatch(req.params.id, req.body);
    return apiResponse(res, 200, 'Plant batch updated successfully', batch);
  } catch (error) {
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
    return apiResponse(res, 200, 'Plant batch deleted successfully');
  } catch (error) {
    next(error);
  }
};
