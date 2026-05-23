import AuditLog from '../models/AuditLog.js';
import apiResponse from '../utils/apiResponse.js';
/**
 * GET /audit-logs
 * List audit logs with pagination (admin/super_admin only).
 */
export const listAuditLogs = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;
        const filter = {};
        // Non-super_admin scoped to their branches
        if (req.user?.role !== 'super_admin') {
            filter.branchId = { $in: req.user?.branches ?? [] };
        }
        else if (req.query.branchId) {
            filter.branchId = req.query.branchId;
        }
        if (req.query.entity)
            filter.entity = req.query.entity;
        if (req.query.action)
            filter.action = req.query.action;
        if (req.query.performedBy)
            filter.performedBy = req.query.performedBy;
        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .populate('performedBy', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(filter),
        ]);
        return apiResponse(res, 200, 'Audit logs retrieved', {
            logs,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (error) {
        next(error);
    }
};
