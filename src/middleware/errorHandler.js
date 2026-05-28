const { AppError } = require('../utils/AppError');
const { logger } = require('../config/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Internal server error';

  if (status >= 500) {
    logger.error({ err, path: req.path, method: req.method }, message);
  } else {
    logger.warn({ err: err.message, path: req.path }, message);
  }

  res.status(status).json({
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && !err.isOperational ? { stack: err.stack } : {})
  });
}

module.exports = { notFoundHandler, errorHandler };
