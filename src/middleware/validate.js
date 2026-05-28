const { ZodError } = require('zod');
const { AppError } = require('../utils/AppError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        return next(new AppError(message, 400, 'VALIDATION_ERROR'));
      }
      next(err);
    }
  };
}

module.exports = { validate };
