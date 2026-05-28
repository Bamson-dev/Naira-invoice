const multer = require('multer');
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

const uploadLogo = [
  upload.single('logo'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const base = process.env.APP_BASE_URL || `${proto}://${host}`;
    const result = await profileService.saveLogo(req.userId, req.file, base);
    res.json(result);
  }
];

module.exports = { get, upsert, uploadLogo };
