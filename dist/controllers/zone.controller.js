import Zone from '../models/Zone.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
export const listZones = async (req, res, next) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter = { isActive: true };
        if (req.user?.role === 'super_admin') {
            if (req.query.branchId) {
                filter.branchId = req.query.branchId;
            }
        }
        else {
            if (req.branchId) {
                filter.branchId = req.branchId;
            }
            else {
                return apiResponse(res, 200, 'Zones retrieved successfully', []);
            }
        }
        const zones = await Zone.find(filter).populate('branchId', 'name code');
        return apiResponse(res, 200, 'Zones retrieved successfully', zones);
    }
    catch (error) {
        next(error);
    }
};
export const getZone = async (req, res, next) => {
    try {
        const zone = await Zone.findById(req.params.id).populate('branchId', 'name code');
        if (!zone) {
            throw ApiError.notFound('Zone not found');
        }
        return apiResponse(res, 200, 'Zone retrieved successfully', zone);
    }
    catch (error) {
        next(error);
    }
};
export const createZone = async (req, res, next) => {
    try {
        const zone = await Zone.create(req.body);
        return apiResponse(res, 201, 'Zone created successfully', zone);
    }
    catch (error) {
        next(error);
    }
};
export const updateZone = async (req, res, next) => {
    try {
        const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!zone) {
            throw ApiError.notFound('Zone not found');
        }
        return apiResponse(res, 200, 'Zone updated successfully', zone);
    }
    catch (error) {
        next(error);
    }
};
export const deleteZone = async (req, res, next) => {
    try {
        const zone = await Zone.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!zone) {
            throw ApiError.notFound('Zone not found');
        }
        return apiResponse(res, 200, 'Zone deactivated successfully');
    }
    catch (error) {
        next(error);
    }
};
