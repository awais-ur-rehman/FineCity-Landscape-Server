import Joi from 'joi';
import { CARE_TYPES, TASK_STATUSES } from '../utils/constants.js';

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

/** Validate complete task request */
export const completeTaskSchema = Joi.object({
  notes: Joi.string().max(1000).allow('', null),
  completedAt: Joi.date().iso().allow(null),
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
  status: Joi.string().valid(...TASK_STATUSES),
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
