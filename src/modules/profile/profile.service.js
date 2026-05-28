const path = require('path');
const fs = require('fs/promises');
const { prisma } = require('../../config/database');
const { AppError } = require('../../utils/AppError');
const { serializeProfile } = require('../../utils/serialize');
const { isAllowedLogoUrl } = require('../../utils/safeUrl');
const { invalidateUserCaches } = require('../../utils/cacheInvalidate');

const ALLOWED_LOGO_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
const MIME_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

async function get(userId) {
  const profile = await prisma.businessProfile.findUnique({ where: { userId } });
  return serializeProfile(profile);
}

async function upsert(userId, body) {
  if (!body.business_name?.trim()) {
    throw new AppError('business_name is required', 400, 'VALIDATION_ERROR');
  }
  if (body.logo_url !== undefined && body.logo_url !== null && body.logo_url !== '') {
    if (!isAllowedLogoUrl(body.logo_url)) {
      throw new AppError('Logo must be uploaded through the app', 400, 'VALIDATION_ERROR');
    }
  }
  const data = {
    businessName: String(body.business_name).trim(),
    businessAddress: body.business_address ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    logoUrl: body.logo_url ?? undefined,
    bankName: body.bank_name ?? null,
    accountNumber: body.account_number ?? null,
    accountName: body.account_name ?? null,
    taxId: body.tax_id ?? null,
    invoicePrefix: body.invoice_prefix || 'INV',
    brandAccentColor: body.brand_accent_color ?? undefined,
    invoiceFooterText: body.invoice_footer_text ?? undefined,
    invoiceSignature: body.invoice_signature ?? undefined,
    invoiceWatermarkText: body.invoice_watermark_text ?? undefined
  };
  if (body.next_invoice_number !== undefined && body.next_invoice_number !== '') {
    data.nextInvoiceNumber = Number(body.next_invoice_number);
  }

  const profile = await prisma.businessProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data
  });

  await prisma.onboardingProgress.upsert({
    where: { userId },
    create: { userId, profileCompleted: true },
    update: { profileCompleted: true }
  });

  await invalidateUserCaches(userId);
  return serializeProfile(profile);
}

async function saveLogo(userId, file, baseUrl) {
  if (!file?.buffer?.length) {
    throw new AppError('No file uploaded', 400, 'VALIDATION_ERROR');
  }
  if (!ALLOWED_LOGO_MIME.has(file.mimetype)) {
    throw new AppError('Logo must be PNG, JPEG, WebP, or GIF', 400, 'VALIDATION_ERROR');
  }
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads/logos');
  await fs.mkdir(uploadDir, { recursive: true });
  const ext = MIME_EXT[file.mimetype] || '.png';
  const fileName = `${userId}-${Date.now()}${ext}`;
  const diskPath = path.join(uploadDir, fileName);
  await fs.writeFile(diskPath, file.buffer);
  const logoUrl = `${baseUrl.replace(/\/+$/, '')}/uploads/logos/${fileName}`;
  await prisma.businessProfile.upsert({
    where: { userId },
    create: { userId, businessName: 'My Business', logoUrl },
    update: { logoUrl }
  });
  await invalidateUserCaches(userId);
  return { logo_url: logoUrl };
}

module.exports = { get, upsert, saveLogo };
