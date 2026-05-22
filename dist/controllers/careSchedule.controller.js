import * as careScheduleService from '../services/careSchedule.service.js';
import AuditLog from '../models/AuditLog.js';
import apiResponse from '../utils/apiResponse.js';
import PlantBatch from '../models/PlantBatch.js';
import ApiError from '../utils/apiError.js';
/** Verify the schedule belongs to a branch the requesting user manages. */
const assertScheduleBranchAccess = async (req, scheduleId) => {
    if (req.user?.role === 'super_admin')
        return;
    const schedule = await careScheduleService.getScheduleById(scheduleId);
    const branchId = schedule.branchId?.toString();
    const hasAccess = req.user?.branches.some((b) => b.toString() === branchId);
    if (!hasAccess)
        throw ApiError.forbidden('Access denied to this schedule');
    return schedule;
};
/**
 * GET /care-schedules
 */
export const listSchedules = async (req, res, next) => {
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
                return apiResponse(res, 200, 'Care schedules retrieved successfully', {
                    schedules: [],
                    pagination: { total: 0, page: 1, limit: 20, pages: 0 },
                });
            }
        }
        const data = await careScheduleService.listSchedules(query);
        return apiResponse(res, 200, 'Care schedules retrieved successfully', data);
    }
    catch (error) {
        next(error);
    }
};
/**
 * GET /care-schedules/:id
 */
export const getSchedule = async (req, res, next) => {
    try {
        const schedule = await careScheduleService.getScheduleById(req.params.id);
        if (req.user?.role !== 'super_admin') {
            const branchId = schedule.branchId?.toString();
            const hasAccess = req.user?.branches.some((b) => b.toString() === branchId);
            if (!hasAccess)
                throw ApiError.forbidden('Access denied to this schedule');
        }
        return apiResponse(res, 200, 'Care schedule retrieved successfully', schedule);
    }
    catch (error) {
        next(error);
    }
};
/**
 * POST /care-schedules
 */
export const createSchedule = async (req, res, next) => {
    try {
        if (req.user) {
            if (req.user.role !== 'super_admin') {
                const batch = await PlantBatch.findById(req.body.batchId);
                if (!batch)
                    throw ApiError.notFound('Plant batch not found');
                const hasAccess = req.user.branches.some((b) => b.toString() === batch.branchId.toString());
                if (!hasAccess)
                    throw ApiError.forbidden('Cannot create schedule for a batch you do not manage');
            }
            const schedule = await careScheduleService.createSchedule(req.body, req.user._id.toString());
            AuditLog.create({
                action: 'CREATE',
                entity: 'CareSchedule',
                entityId: schedule._id?.toString() ?? '',
                performedBy: req.user._id,
                details: { batchId: req.body.batchId, careType: req.body.careType, frequencyDays: req.body.frequencyDays },
            }).catch(() => { });
            return apiResponse(res, 201, 'Care schedule created successfully', schedule);
        }
    }
    catch (error) {
        next(error);
    }
};
/**
 * PUT /care-schedules/:id
 */
export const updateSchedule = async (req, res, next) => {
    try {
        await assertScheduleBranchAccess(req, req.params.id);
        const schedule = await careScheduleService.updateSchedule(req.params.id, req.body);
        AuditLog.create({
            action: 'UPDATE',
            entity: 'CareSchedule',
            entityId: req.params.id,
            performedBy: req.user._id,
            details: { updatedFields: Object.keys(req.body) },
        }).catch(() => { });
        return apiResponse(res, 200, 'Care schedule updated successfully', schedule);
    }
    catch (error) {
        next(error);
    }
};
/**
 * DELETE /care-schedules/:id
 */
export const deleteSchedule = async (req, res, next) => {
    try {
        await assertScheduleBranchAccess(req, req.params.id);
        await careScheduleService.deleteSchedule(req.params.id, req.user._id.toString());
        AuditLog.create({
            action: 'DELETE',
            entity: 'CareSchedule',
            entityId: req.params.id,
            performedBy: req.user._id,
            details: {},
        }).catch(() => { });
        return apiResponse(res, 200, 'Care schedule deactivated successfully');
    }
    catch (error) {
        next(error);
    }
};
