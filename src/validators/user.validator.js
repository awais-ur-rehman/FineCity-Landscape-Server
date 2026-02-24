import Joi from 'joi';

/** Validate create employee request */
export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().allow('', null),
});

/** Validate update user request */
export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().allow('', null),
  email: Joi.string().email(),
}).min(1);
