const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

router.get('/', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id required' });
    }

    let { data, error } = await supabase.from('onboarding_progress').select('*').eq('user_id', userId).maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: newProgress, error: insertError } = await supabase
        .from('onboarding_progress')
        .insert([{ user_id: userId }])
        .select()
        .maybeSingle();

      if (insertError) throw insertError;
      data = newProgress;
    }

    res.json({ progress: data });
  } catch (err) {
    console.error('Get onboarding progress error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

router.put('/', async (req, res) => {
  try {
    const { user_id, ...updates } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase.from('onboarding_progress').select('id').eq('user_id', user_id).maybeSingle();

    if (!existing?.id) {
      const { data: inserted, error: insertError } = await supabase
        .from('onboarding_progress')
        .insert([{ user_id, ...updates }])
        .select()
        .maybeSingle();
      if (insertError) throw insertError;
      return res.json({ progress: inserted });
    }

    const { data: updated, error } = await supabase
      .from('onboarding_progress')
      .update(payload)
      .eq('user_id', user_id)
      .select()
      .maybeSingle();

    if (error) throw error;
    res.json({ progress: updated });
  } catch (err) {
    console.error('Update onboarding progress error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
