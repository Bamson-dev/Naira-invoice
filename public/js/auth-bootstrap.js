/** Shared logout wiring for app shell pages (CSP-safe external script). */
(async () => {
  const u = await requireAuth();
  if (!u) return;
  const link = document.getElementById('logout-link');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
})();
