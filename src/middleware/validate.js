import ApiError from '../utils/apiError.js';

/**
 * Joi validation middleware wrapper.
 * For 'body' source: validates and replaces req.body with stripped value.
 * For 'query'/'params': validates only (Express 5 makes these read-only).
 * Validated query values are stored on req.validatedQuery for convenience.
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate
 * @param {'body'|'query'|'params'} [source='body'] - Request property to validate
 * @returns {import('express').RequestHandler}
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    if (source === 'body') {
      req.body = value;
    } else if (source === 'query') {
      req.validatedQuery = value;
    }

    next();
  };
};

export default validate;
