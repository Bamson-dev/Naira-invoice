async function checkAuth(redirectTo = 'dashboard.html') {
  const user = await requireAuth(false);
  if (user) window.location.replace(redirectTo);
}

async function requireAuth(redirectTo = 'login.html') {
  const token = window.apiClient.getAccessToken();
  if (!token) {
    if (redirectTo) window.location.replace(redirectTo);
    return null;
  }
  try {
    const res = await window.apiClient.apiFetch('/api/auth/me');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.apiClient.clearSession();
      if (redirectTo) {
        const reason = body.error || (res.status === 401 ? 'Session expired' : 'Authentication failed');
        sessionStorage.setItem('ni_auth_message', reason);
        window.location.replace(redirectTo);
      }
      return null;
    }
    const user = body.user;
    if (!user?.id) {
      window.apiClient.clearSession();
      if (redirectTo) window.location.replace(redirectTo);
      return null;
    }
    window.apiClient.persistSession({
      user,
      accessToken: window.apiClient.getAccessToken(),
      refreshToken: window.apiClient.getRefreshToken()
    });
    return user;
  } catch (err) {
    console.error('requireAuth failed', err);
    // Network blips should not clear a valid session or bounce the user to login.
    return null;
  }
}

async function handleSignup(email, password) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, error: { message: data.error || 'Signup failed' } };
  window.apiClient.persistSession(data);
  return { data, error: null };
}

async function handleLogin(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, error: { message: data.error || 'Login failed' } };
  window.apiClient.persistSession(data);
  return { data, error: null };
}

async function handleLogout() {
  const refreshToken = window.apiClient.getRefreshToken();
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  }).catch(() => {});
  window.apiClient.clearSession();
  window.location.href = 'login.html';
}

window.authHelpers = {
  checkAuth,
  requireAuth,
  handleSignup,
  handleLogin,
  handleLogout
};

Object.assign(window, window.authHelpers);
