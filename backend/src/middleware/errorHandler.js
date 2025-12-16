const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 10MB.'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  // OpenAI/API quota errors - always show user-friendly message
  if (err.status === 429 || err.message.includes('Quota Exceeded')) {
    return res.status(429).json({
      success: false,
      error: err.message,
      code: 'QUOTA_EXCEEDED'
    });
  }

  // Authentication errors
  if (err.status === 401) {
    return res.status(401).json({
      success: false,
      error: err.message,
      code: 'UNAUTHORIZED'
    });
  }

  // Forbidden errors
  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      error: err.message,
      code: 'FORBIDDEN'
    });
  }

  // Default error
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
