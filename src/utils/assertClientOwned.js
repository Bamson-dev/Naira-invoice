const { prisma } = require('../config/database');
const { AppError } = require('./AppError');

async function assertClientOwned(userId, clientId, db = prisma) {
  if (!clientId) return null;
  const row = await db.client.findFirst({
    where: { id: clientId, userId, deletedAt: null }
  });
  if (!row) {
    throw new AppError('Client not found or does not belong to your account', 400, 'INVALID_CLIENT');
  }
  return row;
}

module.exports = { assertClientOwned };
