const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { requestLogger } = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { loadEnv } = require('./config/env');

const authRoutes = require('./modules/auth/auth.routes');
const profileRoutes = require('./modules/profile/profile.routes');
const clientRoutes = require('./modules/clients/client.routes');
const invoiceRoutes = require('./modules/invoices/invoice.routes');
const onboardingRoutes = require('./modules/onboarding/onboarding.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');

function createApp() {
  const env = loadEnv();
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(requestLogger);

  const corsOptions =
    env.corsOrigins === '*'
      ? { origin: true, credentials: true }
      : { origin: env.corsOrigins, credentials: true };
  app.use(cors(corsOptions));

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'naira-invoice', ts: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/analytics', analyticsRoutes);

  const uploadDir = path.resolve(env.UPLOAD_DIR || 'uploads/logos');
  fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads/logos', express.static(uploadDir));

  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  app.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon.svg'));

  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.get('/i/:token', (req, res) => {
    res.sendFile(path.join(publicDir, 'invoice-public.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
