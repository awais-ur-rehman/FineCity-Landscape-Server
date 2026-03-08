/**
 * Custom API error class with status code and error code.
 */
class ApiError extends Error {
    statusCode;
    code;
    details;
    isOperational;
    constructor(statusCode, message, code = 'ERROR', details = []) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message, details = []) {
        return new ApiError(400, message, 'VALIDATION_ERROR', details);
    }
    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message, 'UNAUTHORIZED');
    }
    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message, 'FORBIDDEN');
    }
    static notFound(message = 'Resource not found') {
        return new ApiError(404, message, 'NOT_FOUND');
    }
    static tooMany(message = 'Too many requests') {
        return new ApiError(429, message, 'RATE_LIMIT_EXCEEDED');
    }
    static internal(message = 'Internal server error') {
        return new ApiError(500, message, 'INTERNAL_ERROR');
    }
}
export default ApiError;
