const Redis = require('ioredis');
const { logger } = require('./logger');

let client = null;

function getRedis() {
  if (client) return client;
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });
  client.on('error', (err) => logger.warn({ err: err.message }, 'Redis error'));
  return client;
}

async function connectRedis() {
  const redis = getRedis();
  if (redis.status === 'ready') return redis;
  try {
    await redis.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis unavailable — caching disabled');
  }
  return redis;
}

async function cacheGet(key) {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') return null;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 60) {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') return;
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* ignore */
  }
}

async function cacheDel(pattern) {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') return;
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {
    /* ignore */
  }
}

module.exports = { getRedis, connectRedis, cacheGet, cacheSet, cacheDel };
