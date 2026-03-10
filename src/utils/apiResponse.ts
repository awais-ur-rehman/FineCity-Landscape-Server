import { Response } from 'express';

/**
 * Send a standardized API response.
 */
const apiResponse = <T>(res: Response, statusCode: number, message: string, data?: T) => {
  const response: { success: boolean; message: string; data?: T } = {
    success: statusCode >= 200 && statusCode < 300,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export default apiResponse;
