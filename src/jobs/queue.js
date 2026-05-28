/**
 * Background job scaffold — wire BullMQ or similar when async workers are needed.
 * Redis connection is shared via src/config/redis.js
 */
const { logger } = require('../config/logger');

const handlers = new Map();

function registerJob(name, handler) {
  handlers.set(name, handler);
}

async function enqueue(name, payload) {
  logger.debug({ name, payload }, 'Job enqueued (inline stub)');
  const handler = handlers.get(name);
  if (handler) await handler(payload);
}

module.exports = { registerJob, enqueue };
