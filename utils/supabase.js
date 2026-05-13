const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
}

function warnIfNotServiceRole(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (payload.role !== 'service_role') {
      console.warn(
        '[NairaInvoice] SUPABASE_SERVICE_KEY JWT role is "%s" (expected "service_role").',
        payload.role
      );
      console.warn(
        '[NairaInvoice] Use the service_role key from Supabase → Settings → API. Anon key will break inserts behind RLS.'
      );
    }
  } catch {
    // ignore decode errors
  }
}

warnIfNotServiceRole(supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    transport: WebSocket
  }
});

module.exports = supabase;
