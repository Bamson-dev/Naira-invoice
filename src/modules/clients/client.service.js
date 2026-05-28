const { prisma } = require('../../config/database');
const { AppError } = require('../../utils/AppError');
const { serializeClient } = require('../../utils/serialize');
const { cacheDel } = require('../../config/redis');

async function list(userId) {
  const rows = await prisma.client.findMany({
    where: { userId, deletedAt: null },
    orderBy: { clientName: 'asc' }
  });
  return rows.map(serializeClient);
}

async function create(userId, body) {
  const row = await prisma.client.create({
    data: {
      userId,
      clientName: body.client_name,
      clientEmail: body.client_email ?? null,
      clientPhone: body.client_phone ?? null,
      clientAddress: body.client_address ?? null,
      notes: body.notes ?? null
    }
  });
  await cacheDel(`clients:${userId}:*`);
  return serializeClient(row);
}

async function update(id, userId, body) {
  const existing = await prisma.client.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) throw new AppError('Client not found', 404, 'NOT_FOUND');
  const row = await prisma.client.update({
    where: { id },
    data: {
      clientName: body.client_name ?? existing.clientName,
      clientEmail: body.client_email ?? existing.clientEmail,
      clientPhone: body.client_phone ?? existing.clientPhone,
      clientAddress: body.client_address ?? existing.clientAddress,
      notes: body.notes ?? existing.notes
    }
  });
  await cacheDel(`clients:${userId}:*`);
  return serializeClient(row);
}

async function remove(id, userId) {
  const existing = await prisma.client.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) throw new AppError('Client not found', 404, 'NOT_FOUND');
  await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
  await cacheDel(`clients:${userId}:*`);
  return { success: true };
}

module.exports = { list, create, update, remove };
