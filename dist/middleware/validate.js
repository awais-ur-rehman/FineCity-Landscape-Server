import ApiError from '../utils/apiError.js';
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = req[source];
        const { error, value } = schema.validate(data, {
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
        }
        else if (source === 'query') {
            req.validatedQuery = value;
        }
        next();
    };
};
export default validate;
