const LS_KEY = 'ni_recurring_schedules_v1';

function loadSchedules() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSchedules(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

function render() {
  const list = loadSchedules();
  const wrap = document.getElementById('recurring-list');
  if (!list.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔁</div>
        <h3>No recurring presets yet</h3>
        <p>Templates stay in your browser until we wire Postgres schedules.</p>
      </div>`;
    return;
  }
  wrap.innerHTML =
    `<div class="clients-grid">` +
    list
      .map(
        (r, i) => `
    <div class="client-card">
      <div class="client-name">${escapeHtml(r.title)}</div>
      <div class="client-detail">Cadence: ${escapeHtml(r.cadence)}</div>
      <div class="client-detail">Amount: ₦${Number(r.amount || 0).toLocaleString()}</div>
      ${r.note ? `<div class="client-notes">${escapeHtml(r.note)}</div>` : ''}
      <div class="client-actions">
        <button type="button" class="btn btn-secondary btn-sm" onclick="removeSchedule(${i})">Remove</button>
      </div>
    </div>`
      )
      .join('') +
    `</div>`;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function saveSchedule(ev) {
  ev.preventDefault();
  const title = document.getElementById('sch-title').value.trim();
  const cadence = document.getElementById('sch-cadence').value;
  const amount = parseFloat(document.getElementById('sch-amount').value) || 0;
  const note = document.getElementById('sch-note').value.trim();

  if (!title) {
    if (typeof showToast === 'function') showToast('Add a schedule name', 'error');
    return;
  }

  const rows = loadSchedules();
  rows.unshift({ title, cadence, amount, note, created_at: Date.now() });
  saveSchedules(rows);
  ev.target.reset();
  render();
  if (typeof showToast === 'function') showToast('Recurring preset saved locally', 'success');
}

function removeSchedule(i) {
  const rows = loadSchedules();
  rows.splice(i, 1);
  saveSchedules(rows);
  render();
  if (typeof showToast === 'function') showToast('Removed', 'info');
}

window.removeSchedule = removeSchedule;

(async () => {
  const currentUser = await requireAuth();
  if (!currentUser) return;

  const logout = document.getElementById('logout-link');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  document.getElementById('recurring-form').addEventListener('submit', saveSchedule);
  render();
})();
