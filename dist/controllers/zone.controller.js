import Zone from '../models/Zone.js';
import apiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
/** Assert that the requesting admin has access to the given branchId. */
const assertBranchAccess = (req, branchId) => {
    if (req.user?.role === 'super_admin')
        return;
    const hasAccess = req.user?.branches.some((b) => b.toString() === branchId);
    if (!hasAccess) {
        throw ApiError.forbidden('You do not manage the branch for this zone');
    }
};
export const listZones = async (req, res, next) => {
    try {
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
        assertBranchAccess(req, zone.branchId.toString());
        return apiResponse(res, 200, 'Zone retrieved successfully', zone);
    }
    catch (error) {
        next(error);
    }
};
export const createZone = async (req, res, next) => {
    try {
        const { branchId } = req.body;
        assertBranchAccess(req, branchId);
        const zone = await Zone.create(req.body);
        return apiResponse(res, 201, 'Zone created successfully', zone);
    }
    catch (error) {
        next(error);
    }
};
export const updateZone = async (req, res, next) => {
    try {
        const existing = await Zone.findById(req.params.id);
        if (!existing) {
            throw ApiError.notFound('Zone not found');
        }
        assertBranchAccess(req, existing.branchId.toString());
        const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        return apiResponse(res, 200, 'Zone updated successfully', zone);
    }
    catch (error) {
        next(error);
    }
};
export const deleteZone = async (req, res, next) => {
    try {
        const existing = await Zone.findById(req.params.id);
        if (!existing) {
            throw ApiError.notFound('Zone not found');
        }
        assertBranchAccess(req, existing.branchId.toString());
        await Zone.findByIdAndUpdate(req.params.id, { isActive: false });
        return apiResponse(res, 200, 'Zone deactivated successfully');
    }
    catch (error) {
        next(error);
    }
};
