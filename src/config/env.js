const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  UPLOAD_DIR: z.string().default('uploads/logos'),
  MAX_LOGO_BYTES: z.coerce.number().default(2 * 1024 * 1024),
  EMAIL_FROM: z.string().default('noreply@nairainvoice.app')
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }
  const data = parsed.data;
  return {
    ...data,
    corsOrigins: data.CORS_ORIGINS === '*' ? '*' : data.CORS_ORIGINS.split(',').map((s) => s.trim())
  };
}

module.exports = { loadEnv };
