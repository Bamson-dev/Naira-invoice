const { prisma } = require('../../config/database');

async function get(userId) {
  let progress = await prisma.onboardingProgress.findUnique({ where: { userId } });
  if (!progress) {
    progress = await prisma.onboardingProgress.create({ data: { userId } });
  }
  return format(progress);
}

async function update(userId, updates) {
  const allowed = [
    'profile_completed',
    'client_added',
    'invoice_created',
    'wizard_dismissed',
    'checklist_closed'
  ];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      data[camel] = updates[key];
    }
  }
  const progress = await prisma.onboardingProgress.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data
  });
  return format(progress);
}

function format(row) {
  return {
    id: row.id,
    user_id: row.userId,
    profile_completed: row.profileCompleted,
    client_added: row.clientAdded,
    invoice_created: row.invoiceCreated,
    wizard_dismissed: row.wizardDismissed,
    checklist_closed: row.checklistClosed,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  };
}

module.exports = { get, update };
