const { prisma } = require('../../config/database');
const { cacheGet, cacheSet } = require('../../config/redis');
const { decimalToNumber } = require('../../utils/serialize');

async function dashboardSummary(userId) {
  const cacheKey = `analytics:${userId}:summary`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const invoices = await prisma.invoice.findMany({
    where: { userId, deletedAt: null },
    select: { status: true, totalAmount: true, createdAt: true, invoiceDate: true }
  });

  let totalRevenue = 0;
  let paid = 0;
  let pending = 0;
  let overdue = 0;
  let draft = 0;

  for (const inv of invoices) {
    const amount = decimalToNumber(inv.totalAmount);
    if (inv.status === 'paid') {
      paid += 1;
      totalRevenue += amount;
    } else if (inv.status === 'overdue') overdue += 1;
    else if (inv.status === 'draft') draft += 1;
    else pending += 1;
  }

  const summary = {
    invoice_count: invoices.length,
    paid_count: paid,
    pending_count: pending,
    overdue_count: overdue,
    draft_count: draft,
    total_revenue: totalRevenue
  };

  await cacheSet(cacheKey, summary, 120);
  return summary;
}

module.exports = { dashboardSummary };
