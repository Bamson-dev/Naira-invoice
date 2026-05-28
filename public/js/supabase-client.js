window.supabaseClient = null;

window.supabaseReady = (async () => {
  const res = await fetch('/api/config');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Could not load Supabase configuration from server');
  }
  const { supabaseUrl, supabaseAnonKey } = body;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Invalid Supabase configuration from server');
  }
  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  return window.supabaseClient;
})();
