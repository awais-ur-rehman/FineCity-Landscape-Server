import Joi from 'joi';
import { CARE_TYPES, TASK_STATUSES } from '../utils/constants.js';
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const fertilizerUsageItemSchema = Joi.object({
    fertilizerId: objectId.required().messages({
        'string.pattern.base': 'fertilizerId must be a valid ObjectId',
        'any.required': 'fertilizerId is required',
    }),
    quantity: Joi.number().positive().required().messages({
        'number.positive': 'quantity must be greater than 0',
        'any.required': 'quantity is required',
    }),
    unit: Joi.string().valid('ml', 'g', 'kg', 'L').required().messages({
        'any.only': 'unit must be one of: ml, g, kg, L',
        'any.required': 'unit is required',
    }),
});
/** Validate complete task request */
export const completeTaskSchema = Joi.object({
    notes: Joi.string().max(1000).allow('', null),
    completedAt: Joi.date().iso().allow(null),
    fertilizerUsages: Joi.array().items(fertilizerUsageItemSchema).optional(),
});
/** Validate skip task request */
export const skipTaskSchema = Joi.object({
    reason: Joi.string().max(500).required().messages({
        'any.required': 'Skip reason is required',
    }),
});
/** Validate query params for listing tasks */
export const listCareTaskQuerySchema = Joi.object({
    branchId: objectId,
    status: Joi.string().valid(...TASK_STATUSES, 'overdue'),
    date: Joi.date().iso(),
    careType: Joi.string().valid(...CARE_TYPES),
    batchId: objectId,
    assignedTo: objectId,
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
});
/** Validate stats query params */
export const statsQuerySchema = Joi.object({
    branchId: objectId,
    from: Joi.date().iso().required(),
    to: Joi.date().iso().required(),
});
/** Validate fertilizer usage history query */
export const fertilizerUsageHistorySchema = Joi.object({
    branchId: objectId,
    batchId: objectId,
    scheduleId: objectId,
    completedBy: objectId,
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});
