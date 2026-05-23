import Joi from 'joi';

/** Reusable MongoDB ObjectId validator */
export const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Must be a valid ObjectId' });

/** Param schema for routes with a single :id MongoDB ObjectId */
export const objectIdParamSchema = Joi.object({
  id: objectId.required(),
});
