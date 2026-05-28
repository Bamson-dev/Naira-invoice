async function checkAuth(redirectTo = 'dashboard.html') {
  const user = await requireAuth(false);
  if (user) window.location.replace(redirectTo);
}

async function requireAuth(redirectTo = 'login.html') {
  const stored = window.apiClient.getStoredUser();
  const token = window.apiClient.getAccessToken();
  if (!token) {
    if (redirectTo) window.location.href = redirectTo;
    return null;
  }
  try {
    const res = await window.apiClient.apiFetch('/api/auth/me');
    if (!res.ok) {
      window.apiClient.clearSession();
      if (redirectTo) window.location.href = redirectTo;
      return null;
    }
    const { user } = await res.json();
    window.apiClient.persistSession({ user, accessToken: token, refreshToken: window.apiClient.getRefreshToken() });
    return user;
  } catch {
    if (redirectTo) window.location.href = redirectTo;
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
