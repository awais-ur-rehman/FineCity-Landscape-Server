import ApiError from '../utils/apiError.js';

/**
 * Joi validation middleware wrapper.
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate req.body
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

    req[source] = value;
    next();
  };
};

export default validate;
