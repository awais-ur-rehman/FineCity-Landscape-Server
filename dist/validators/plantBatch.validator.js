import Joi from 'joi';
/** Validate create plant batch request */
export const createPlantBatchSchema = Joi.object({
    branchId: Joi.string().hex().length(24).required(),
    name: Joi.string().min(2).max(200).required(),
    plantType: Joi.string().hex().length(24).required(),
    scientificName: Joi.string().max(200).allow('', null),
    category: Joi.string().hex().length(24).required(),
    quantity: Joi.number().integer().min(0).allow(null),
    zone: Joi.string().hex().length(24).required(),
    location: Joi.string().max(200).allow('', null),
    imageUrl: Joi.string().uri().allow('', null),
    notes: Joi.string().max(1000).allow('', null),
});
/** Validate update plant batch request */
export const updatePlantBatchSchema = Joi.object({
    branchId: Joi.string().hex().length(24),
    name: Joi.string().min(2).max(200),
    plantType: Joi.string().hex().length(24),
    scientificName: Joi.string().max(200).allow('', null),
    category: Joi.string().hex().length(24).allow(null),
    quantity: Joi.number().integer().min(0).allow(null),
    zone: Joi.string().hex().length(24).allow(null),
    location: Joi.string().max(200).allow('', null),
    imageUrl: Joi.string().uri().allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    status: Joi.string().valid('active', 'archived'),
}).min(1);
/** Validate query parameters for listing batches */
export const listPlantBatchQuerySchema = Joi.object({
    branchId: Joi.string().hex().length(24),
    zone: Joi.string().hex().length(24),
    category: Joi.string().hex().length(24),
    status: Joi.string().valid('active', 'archived'),
    search: Joi.string().max(200),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});
