import Joi from 'joi';
import { CARE_TYPES } from '../utils/constants.js';

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

/** Validate create care schedule request */
export const createCareScheduleSchema = Joi.object({
  batchId: objectId.required().messages({
    'string.pattern.base': 'batchId must be a valid ObjectId',
    'any.required': 'batchId is required',
  }),
  careType: Joi.string().valid(...CARE_TYPES).required(),
  frequencyDays: Joi.number().integer().min(1).max(365).required(),
  scheduledTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      'string.pattern.base': 'scheduledTime must be in HH:mm format (00:00–23:59)',
    }),
  assignedTo: Joi.array().items(objectId).default([]),
  instructions: Joi.string().max(1000).allow('', null),
  startDate: Joi.date().iso().required(),
  isActive: Joi.boolean().default(true),
});

/** Validate update care schedule request */
export const updateCareScheduleSchema = Joi.object({
  careType: Joi.string().valid(...CARE_TYPES),
  frequencyDays: Joi.number().integer().min(1).max(365),
  scheduledTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .messages({
      'string.pattern.base': 'scheduledTime must be in HH:mm format (00:00–23:59)',
    }),
  assignedTo: Joi.array().items(objectId),
  instructions: Joi.string().max(1000).allow('', null),
  isActive: Joi.boolean(),
}).min(1);

/** Validate query params for listing schedules */
export const listCareScheduleQuerySchema = Joi.object({
  batchId: objectId,
  careType: Joi.string().valid(...CARE_TYPES),
  isActive: Joi.string().valid('true', 'false'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
