import Joi from 'joi';
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
// --- Branch Validators ---
export const createBranchSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(10).uppercase().required(),
    location: Joi.string().required(),
    contactPerson: Joi.string().required(),
    contactEmail: Joi.string().email().required(),
    contactPhone: Joi.string().allow('', null),
});
export const updateBranchSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    code: Joi.string().min(2).max(10).uppercase(),
    location: Joi.string(),
    contactPerson: Joi.string(),
    contactEmail: Joi.string().email(),
    contactPhone: Joi.string().allow('', null),
    isActive: Joi.boolean(),
}).min(1);
// --- Zone Validators ---
export const createZoneSchema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    code: Joi.string().min(1).max(20).uppercase().required(),
    branchId: objectId.required(),
    description: Joi.string().allow('', null),
});
export const updateZoneSchema = Joi.object({
    name: Joi.string().min(1).max(100),
    code: Joi.string().min(1).max(20).uppercase(),
    branchId: objectId,
    description: Joi.string().allow('', null),
    isActive: Joi.boolean(),
}).min(1);
export const listZoneQuerySchema = Joi.object({
    branchId: objectId,
});
// --- Category Validators ---
export const createCategorySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().min(2).max(100).lowercase().required(),
    description: Joi.string().allow('', null),
});
export const updateCategorySchema = Joi.object({
    name: Joi.string().min(2).max(100),
    slug: Joi.string().min(2).max(100).lowercase(),
    description: Joi.string().allow('', null),
    isActive: Joi.boolean(),
}).min(1);
// --- PlantType Validators ---
export const createPlantTypeSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    scientificName: Joi.string().allow('', null),
    description: Joi.string().allow('', null),
    careInstructions: Joi.string().allow('', null),
    imageUrl: Joi.string().uri().allow('', null),
});
export const updatePlantTypeSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    scientificName: Joi.string().allow('', null),
    description: Joi.string().allow('', null),
    careInstructions: Joi.string().allow('', null),
    imageUrl: Joi.string().uri().allow('', null),
    isActive: Joi.boolean(),
}).min(1);
