import * as fertilizerService from '../services/fertilizer.service.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
export const listFertilizers = async (req, res, next) => {
    try {
        const { type, search, isActive, page, limit } = req.query;
        // Non-super_admin always scoped to their current branch — cannot query other branches
        const branchId = req.user?.role === 'super_admin'
            ? req.query.branchId
            : req.branchId;
        const result = await fertilizerService.listFertilizers({
            branchId,
            type: type,
            search: search,
            isActive: isActive ? isActive === 'true' : undefined,
            page: Number(page) || 1,
            limit: Number(limit) || 20,
        });
        return apiResponse(res, 200, 'Fertilizers retrieved successfully', result);
    }
    catch (error) {
        next(error);
    }
};
export const getFertilizer = async (req, res, next) => {
    try {
        const fertilizer = await fertilizerService.getFertilizerById(req.params.id);
        return apiResponse(res, 200, 'Fertilizer details', fertilizer);
    }
    catch (error) {
        next(error);
    }
};
export const createFertilizer = async (req, res, next) => {
    try {
        if (!req.user)
            throw ApiError.unauthorized('Not authenticated');
        const fertilizer = await fertilizerService.createFertilizer(req.body, req.user._id.toString(), req.branchId);
        return apiResponse(res, 201, 'Fertilizer created successfully', fertilizer);
    }
    catch (error) {
        next(error);
    }
};
export const updateFertilizer = async (req, res, next) => {
    try {
        if (!req.user)
            throw ApiError.unauthorized('Not authenticated');
        const fertilizer = await fertilizerService.updateFertilizer(req.params.id, req.body, req.user.branches.map((b) => b.toString()), req.user.role === 'super_admin');
        return apiResponse(res, 200, 'Fertilizer updated successfully', fertilizer);
    }
    catch (error) {
        next(error);
    }
};
export const deleteFertilizer = async (req, res, next) => {
    try {
        if (!req.user)
            throw ApiError.unauthorized('Not authenticated');
        await fertilizerService.deleteFertilizer(req.params.id, req.user.branches.map((b) => b.toString()), req.user.role === 'super_admin');
        return apiResponse(res, 200, 'Fertilizer deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
