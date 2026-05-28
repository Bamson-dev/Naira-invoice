async function getClient() {
  await window.supabaseReady;
  return window.supabaseClient;
}

async function checkAuth(redirectTo = 'dashboard.html') {
  const supabaseClient = await getClient();
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = redirectTo;
  }
}

async function requireAuth(redirectTo = 'login.html') {
  const supabaseClient = await getClient();
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session.user;
}

async function handleSignup(email, password) {
  const supabaseClient = await getClient();
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password
  });
  return { data, error };
}

async function handleLogin(email, password) {
  const supabaseClient = await getClient();
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });
  return { data, error };
}

async function handleLogout() {
  const supabaseClient = await getClient();
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

window.authHelpers = {
  checkAuth,
  requireAuth,
  handleSignup,
  handleLogin,
  handleLogout
};
