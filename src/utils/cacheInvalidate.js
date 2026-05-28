const { cacheDel } = require('../config/redis');

/** Invalidate cached keys for a user after data mutations. */
async function invalidateUserCaches(userId) {
  if (!userId) return;
  await Promise.all([
    cacheDel(`analytics:${userId}:summary`),
    cacheDel(`invoices:${userId}:*`),
    cacheDel(`clients:${userId}:*`)
  ]);
}

module.exports = { invalidateUserCaches };
