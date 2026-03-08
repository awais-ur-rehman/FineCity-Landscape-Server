import Joi from 'joi';

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

/** Validate sync request body */
export const syncSchema = Joi.object({
  lastSyncAt: Joi.date().iso().required().messages({
    'any.required': 'lastSyncAt is required',
  }),
  completedTasks: Joi.array()
    .items(
      Joi.object({
        taskId: objectId.required(),
        completedAt: Joi.date().iso().required(),
        notes: Joi.string().max(1000).allow('', null),
      }),
    )
    .default([]),
});
