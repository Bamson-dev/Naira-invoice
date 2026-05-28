const multer = require('multer');
const { asyncHandler } = require('../../utils/asyncHandler');
const { AppError } = require('../../utils/AppError');
const profileService = require('./profile.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_LOGO_BYTES || 2 * 1024 * 1024) }
});

async function get(req, res) {
  const profile = await profileService.get(req.query.user_id || req.userId);
  res.json({ profile });
}

async function upsert(req, res) {
  const profile = await profileService.upsert(req.userId, req.body);
  res.json({ profile });
}

async function uploadLogo(req, res) {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'VALIDATION_ERROR');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const base = process.env.APP_BASE_URL || `${proto}://${host}`;
  const result = await profileService.saveLogo(req.userId, req.file, base);
  res.json(result);
}

const uploadLogoMiddleware = upload.single('logo');

module.exports = { get, upsert, uploadLogo, uploadLogoMiddleware };
