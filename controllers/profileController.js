const supabase = require('../utils/supabase');
const multer = require('multer');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });

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
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ profile: data || null });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createOrUpdateProfile = async (req, res) => {
  try {
    const profile = req.body;

    const { data: existing } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', profile.user_id)
      .single();

    let data;
    let error;

    if (existing) {
      ({ data, error } = await supabase
        .from('business_profiles')
        .update(profile)
        .eq('user_id', profile.user_id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('business_profiles')
        .insert([profile])
        .select()
        .single());
    }

    if (error) throw error;
    res.json({ profile: data });
  } catch (error) {
    console.error('Create/update profile error:', error);
    res.status(500).json({ error: error.message });
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

      const { error: uploadError } = await supabase.storage
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
