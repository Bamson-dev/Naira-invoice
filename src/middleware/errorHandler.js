const { AppError } = require('../utils/AppError');
const { logger } = require('../config/logger');

function mapPrismaError(err) {
  if (!err || typeof err.code !== 'string' || !err.code.startsWith('P')) return err;
  if (err.code === 'P2002') {
    return new AppError('A record with this value already exists', 409, 'CONFLICT');
  }
  if (err.code === 'P2025') {
    return new AppError('Record not found', 404, 'NOT_FOUND');
  }
  if (err.code === 'P2003') {
    return new AppError('Related record not found', 400, 'VALIDATION_ERROR');
  }
  return err;
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err?.name === 'MulterError') {
    return res.status(400).json({ error: err.message, code: 'UPLOAD_ERROR' });
  }

  err = mapPrismaError(err);

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

module.exports = { notFoundHandler, errorHandler, mapPrismaError };
