import Joi from 'joi';
import { PLANT_CATEGORIES } from '../utils/constants.js';

/** Validate create plant batch request */
export const createPlantBatchSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  plantType: Joi.string().min(2).max(100).required(),
  scientificName: Joi.string().max(200).allow('', null),
  category: Joi.string().valid(...PLANT_CATEGORIES).allow(null),
  quantity: Joi.number().integer().min(0).allow(null),
  zone: Joi.string().max(50).allow('', null),
  location: Joi.string().max(200).allow('', null),
  imageUrl: Joi.string().uri().allow('', null),
  notes: Joi.string().max(1000).allow('', null),
});

/** Validate update plant batch request */
export const updatePlantBatchSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  plantType: Joi.string().min(2).max(100),
  scientificName: Joi.string().max(200).allow('', null),
  category: Joi.string().valid(...PLANT_CATEGORIES).allow(null),
  quantity: Joi.number().integer().min(0).allow(null),
  zone: Joi.string().max(50).allow('', null),
  location: Joi.string().max(200).allow('', null),
  imageUrl: Joi.string().uri().allow('', null),
  notes: Joi.string().max(1000).allow('', null),
  status: Joi.string().valid('active', 'archived'),
}).min(1);

/** Validate query parameters for listing batches */
export const listPlantBatchQuerySchema = Joi.object({
  zone: Joi.string().max(50),
  category: Joi.string().valid(...PLANT_CATEGORIES),
  status: Joi.string().valid('active', 'archived'),
  search: Joi.string().max(200),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
