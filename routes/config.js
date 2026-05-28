const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Server missing SUPABASE_URL or SUPABASE_ANON_KEY. Set them in Render → Environment.'
    });
  }

  res.json({ supabaseUrl, supabaseAnonKey });
});

module.exports = router;
