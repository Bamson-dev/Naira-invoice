const { logger } = require('../config/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start
    });
  });
  next();
}

module.exports = { requestLogger };
