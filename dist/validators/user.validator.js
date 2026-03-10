import Joi from 'joi';
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
/** Validate create employee request */
export const createUserSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().allow('', null),
    branches: Joi.array().items(objectId).default([]),
    currentBranch: objectId,
});
/** Validate update user request */
export const updateUserSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    phone: Joi.string().allow('', null),
    email: Joi.string().email(),
    branches: Joi.array().items(objectId),
    currentBranch: objectId,
}).min(1);
/** Validate switch branch request */
export const switchBranchSchema = Joi.object({
    branchId: objectId.required(),
});
