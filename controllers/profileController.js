const supabase = require('../utils/supabase');
const multer = require('multer');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });

function sanitizeProfilePayload(body) {
  const allowed = [
    'user_id',
    'business_name',
    'business_address',
    'phone',
    'email',
    'logo_url',
    'bank_name',
    'account_number',
    'account_name',
    'tax_id',
    'invoice_prefix',
    'brand_accent_color',
    'invoice_footer_text',
    'invoice_signature',
    'invoice_watermark_text'
  ];
  const row = {};
  for (const key of allowed) {
    const v = body[key];
    if (v !== undefined && v !== '') {
      row[key] = v;
    }
  }
  if (!row.invoice_prefix) {
    row.invoice_prefix = 'INV';
  }
  if (body.next_invoice_number !== undefined && body.next_invoice_number !== '') {
    row.next_invoice_number = Number(body.next_invoice_number);
  }
  return row;
}

exports.getProfile = async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    res.json({ profile: data ?? null });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createOrUpdateProfile = async (req, res) => {
  try {
    const raw = req.body || {};
    if (!raw.user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    if (!raw.business_name || String(raw.business_name).trim() === '') {
      return res.status(400).json({ error: 'business_name is required' });
    }

    const payload = sanitizeProfilePayload(raw);
    payload.business_name = String(raw.business_name).trim();

    const { data: rows, error } = await supabase
      .from('business_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*');

    if (error) throw error;

    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data) {
      return res.status(500).json({
        error:
          'Profile upsert returned no row. Check Supabase: table business_profiles exists, user_id exists in auth.users, and SUPABASE_SERVICE_KEY is the service_role key.'
      });
    }

    res.json({ profile: data });
  } catch (error) {
    console.error('Create/update profile error:', error);
    const msg = error.message || error.details || JSON.stringify(error);
    res.status(500).json({ error: msg, code: error.code });
  }
};

exports.uploadLogo = [
  upload.single('logo'),
  async (req, res) => {
    try {
      const userId = req.body.user_id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileExt = path.extname(file.originalname);
      const fileName = `${userId}-${Date.now()}${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      res.json({ logo_url: urlData.publicUrl });
    } catch (error) {
      console.error('Upload logo error:', error);
      res.status(500).json({ error: error.message });
    }
  }
];
