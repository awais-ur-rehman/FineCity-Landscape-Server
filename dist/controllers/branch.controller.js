import Branch from '../models/Branch.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
export const listBranches = async (req, res, next) => {
    try {
        const branches = await Branch.find({ isActive: true });
        return apiResponse(res, 200, 'Branches retrieved successfully', branches);
    }
    catch (error) {
        next(error);
    }
};
export const getBranch = async (req, res, next) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            throw ApiError.notFound('Branch not found');
        }
        return apiResponse(res, 200, 'Branch retrieved successfully', branch);
    }
    catch (error) {
        next(error);
    }
};
export const createBranch = async (req, res, next) => {
    try {
        const branch = await Branch.create(req.body);
        return apiResponse(res, 201, 'Branch created successfully', branch);
    }
    catch (error) {
        next(error);
    }
};
export const updateBranch = async (req, res, next) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!branch) {
            throw ApiError.notFound('Branch not found');
        }
        return apiResponse(res, 200, 'Branch updated successfully', branch);
    }
    catch (error) {
        next(error);
    }
};
export const deleteBranch = async (req, res, next) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!branch) {
            throw ApiError.notFound('Branch not found');
        }
        return apiResponse(res, 200, 'Branch deactivated successfully');
    }
    catch (error) {
        next(error);
    }
};
