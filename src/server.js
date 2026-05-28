require('dotenv').config();

const { createApp } = require('./app');
const { connectRedis } = require('./config/redis');
const { logger } = require('./config/logger');
const { loadEnv } = require('./config/env');

async function start() {
  loadEnv();
  await connectRedis();

  const app = createApp();
  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    logger.info({ port }, 'NairaInvoice API running');
  });
}

start().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
