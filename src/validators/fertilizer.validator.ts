import Joi from 'joi';
import { objectId } from './common.validator.js';

export const createFertilizerSchema = Joi.object({
  name: Joi.string().required().trim().min(2),
  brand: Joi.string().trim().optional(),
  type: Joi.string().valid('organic', 'chemical', 'bio').default('chemical'),
  npkRatio: Joi.string().trim().optional(),
  description: Joi.string().trim().optional(),
  defaultDosage: Joi.number().positive().optional(),
  defaultUnit: Joi.string().valid('ml', 'g', 'kg', 'L').optional(),
  isActive: Joi.boolean().default(true),
});

export const updateFertilizerSchema = Joi.object({
  name: Joi.string().trim().min(2),
  brand: Joi.string().trim(),
  type: Joi.string().valid('organic', 'chemical', 'bio'),
  npkRatio: Joi.string().trim(),
  description: Joi.string().trim(),
  defaultDosage: Joi.number().positive(),
  defaultUnit: Joi.string().valid('ml', 'g', 'kg', 'L'),
  isActive: Joi.boolean(),
});
