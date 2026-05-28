const TOKEN_KEY = 'ni_access_token';
const REFRESH_KEY = 'ni_refresh_token';
const USER_KEY = 'ni_user';

/** Native fetch — never use patched window.fetch inside apiFetch (avoids infinite recursion). */
const nativeFetch = window.fetch.bind(window);

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
  '/api/auth/password/',
  '/api/invoices/public/',
  '/api/health'
];

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function persistSession({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function isPublicApiUrl(url) {
  return PUBLIC_API_PREFIXES.some((p) => url.startsWith(p));
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const res = await nativeFetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const data = await res.json();
  persistSession(data);
  return data.accessToken;
}

async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await nativeFetch(url, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await nativeFetch(url, { ...options, headers });
    }
  }

  return res;
}

window.apiClient = {
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  persistSession,
  clearSession,
  apiFetch,
  nativeFetch
};

/** Attach JWT to same-origin /api calls (except public routes). */
window.fetch = function patchedFetch(input, init) {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (!url.startsWith('/api/')) {
    return nativeFetch(input, init);
  }
  if (isPublicApiUrl(url) || !getAccessToken()) {
    return nativeFetch(input, init);
  }
  return apiFetch(url, init);
};
