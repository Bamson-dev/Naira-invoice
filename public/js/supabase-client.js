window.supabaseClient = null;

function readInlineConfig() {
  const cfg = window.__APP_CONFIG__;
  if (cfg?.supabaseUrl && cfg?.supabaseAnonKey) {
    return { supabaseUrl: cfg.supabaseUrl, supabaseAnonKey: cfg.supabaseAnonKey };
  }
  return null;
}

window.supabaseReady = (async () => {
  let supabaseUrl;
  let supabaseAnonKey;

  const inline = readInlineConfig();
  if (inline) {
    ({ supabaseUrl, supabaseAnonKey } = inline);
  } else {
    const res = await fetch('/api/config', { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        body.error ||
          'Supabase is not configured on the server. Add SUPABASE_URL and SUPABASE_ANON_KEY in Render → Environment, then redeploy.'
      );
    }
    ({ supabaseUrl, supabaseAnonKey } = body);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Invalid Supabase configuration from server');
  }

  if (supabaseUrl.includes('zemwinhdipgqkdfdubps')) {
    throw new Error(
      'Outdated Supabase URL detected. Update SUPABASE_URL in Render to your current project (Settings → API).'
    );
  }

  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  return window.supabaseClient;
})();
