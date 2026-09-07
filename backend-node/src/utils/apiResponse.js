/**
 * Standardized API Response Utilities
 * Enforces consistent response envelope per rules.md §8:
 * - Success: { success: true, data: ..., message?: string }
 * - Error: { success: false, error: { code: string, message: string, details?: any[] } }
 */

class ApiResponse {
  static success(res, data = null, message = null, statusCode = 200) {
    const payload = { success: true };
    if (message) payload.message = message;
    if (data !== null) payload.data = data;
    return res.status(statusCode).json(payload);
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return ApiResponse.success(res, data, message, 201);
  }

  static paginated(res, items, total, page = 1, limit = 10, message = 'Data retrieved successfully') {
    return ApiResponse.success(
      res,
      {
        items,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message
    );
  }

  static error(res, message, statusCode = 500, code = 'SERVER_ERROR', details = null) {
    const payload = {
      success: false,
      error: {
        code,
        message,
      },
    };
    if (details && Array.isArray(details) && details.length > 0) {
      payload.error.details = details;
    }
    return res.status(statusCode).json(payload);
  }

  static badRequest(res, message = 'Bad request', code = 'BAD_REQUEST', details = null) {
    return ApiResponse.error(res, message, 400, code, details);
  }

  static unauthenticated(res, message = 'Authentication required', code = 'UNAUTHENTICATED') {
    return ApiResponse.error(res, message, 401, code);
  }

  static forbidden(res, message = 'Access denied', code = 'FORBIDDEN') {
    return ApiResponse.error(res, message, 403, code);
  }

  static notFound(res, message = 'Resource not found', code = 'NOT_FOUND') {
    return ApiResponse.error(res, message, 404, code);
  }

  static conflict(res, message = 'Resource conflict', code = 'CONFLICT') {
    return ApiResponse.error(res, message, 409, code);
  }

  static validationError(res, message = 'Validation failed', details = null) {
    return ApiResponse.error(res, message, 422, 'VALIDATION_ERROR', details);
  }
}

module.exports = ApiResponse;

