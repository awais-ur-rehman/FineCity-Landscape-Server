/**
 * Send a standardized API response.
 */
const apiResponse = (res, statusCode, message, data) => {
    const response = {
        success: statusCode >= 200 && statusCode < 300,
        message,
    };
    if (data !== undefined) {
        response.data = data;
    }
    return res.status(statusCode).json(response);
};
export default apiResponse;
