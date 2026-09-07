/**
 * Centralized Error Handling Middleware
 * Per rules.md §14:
 * - Never leak stack traces, internal paths, or secrets to the client.
 * - Map errors to consistent HTTP status codes and safe, actionable error shapes.
 * - Log complete error context server-side for operational diagnosis.
 */
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');

function errorHandler(err, req, res, _next) {
  // Log full error details server-side
  logger.error('Unhandled or captured error in request pipeline', {
    requestId: req.id,
    path: req.originalUrl,
    method: req.method,
    errorMessage: err.message,
    errorName: err.name,
    stack: err.stack,
  });

  // 1. JSON Syntax Error (malformed body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.badRequest(res, 'Malformed JSON payload in request body', 'INVALID_JSON');
  }

  // 2. Mongoose / MongoDB Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.entries(err.errors || {}).map(([field, errorObj]) => ({
      field,
      message: errorObj.message,
      value: errorObj.value,
    }));
    return ApiResponse.validationError(res, 'Validation failed for submitted data', details);
  }

  // 3. Mongoose CastError (e.g. invalid ObjectId or type cast)
  if (err.name === 'CastError') {
    return ApiResponse.badRequest(
      res,
      `Invalid format for field '${err.path}'`,
      'INVALID_FIELD_FORMAT'
    );
  }

  // 4. MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return ApiResponse.conflict(
      res,
      `A record with this ${field} already exists`,
      'DUPLICATE_KEY_ERROR'
    );
  }

  // 5. Explicit Custom Application Error (with statusCode)
  if (err.statusCode && err.statusCode < 500) {
    return ApiResponse.error(res, err.message, err.statusCode, err.code || 'CLIENT_ERROR');
  }

  // 6. Generic Internal Server Error (never leak stack trace or internal details)
  return ApiResponse.error(
    res,
    'An internal server error occurred. Please contact system support.',
    500,
    'INTERNAL_SERVER_ERROR'
  );
}

module.exports = errorHandler;

