const Redis = require('ioredis');
const { logger } = require('./logger');

let client = null;
let redisEnabled = false;

function isRedisConfigured() {
  const url = (process.env.REDIS_URL || '').trim();
  return Boolean(url && url !== 'false' && url !== 'disabled');
}

function getRedis() {
  if (!redisEnabled) return null;
  return client;
}

async function connectRedis() {
  if (!isRedisConfigured()) {
    logger.info('REDIS_URL not set — caching disabled (this is fine on free tier)');
    return null;
  }

  if (client?.status === 'ready') return client;

  const url = process.env.REDIS_URL.trim();
  client = new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    retryStrategy: () => null
  });

  client.on('error', () => {
    /* avoid log spam; connect failure handled once below */
  });

  try {
    await client.connect();
    redisEnabled = true;
    logger.info('Redis connected');
    return client;
  } catch (err) {
    redisEnabled = false;
    try {
      client.disconnect();
    } catch {
      /* ignore */
    }
    client = null;
    logger.warn({ err: err.message }, 'Redis unavailable — caching disabled');
    return null;
  }
}

async function cacheGet(key) {
  try {
    const redis = getRedis();
    if (!redis || redis.status !== 'ready') return null;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 60) {
  try {
    const redis = getRedis();
    if (!redis || redis.status !== 'ready') return;
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* ignore */
  }
}

async function cacheDel(pattern) {
  try {
    const redis = getRedis();
    if (!redis || redis.status !== 'ready') return;
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {
    /* ignore */
  }
}

module.exports = { getRedis, connectRedis, cacheGet, cacheSet, cacheDel, isRedisConfigured };
