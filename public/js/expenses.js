const LS_KEY = 'ni_expenses_v1';

function loadRows() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRows(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function render() {
  const rows = loadRows();
  const el = document.getElementById('expense-list');
  if (!rows.length) {
    el.innerHTML =
      '<div class="empty-state"><div class="empty-icon">📉</div><h3>No expenses logged</h3><p>Track spend outside invoices for richer analytics later.</p></div>';
    return;
  }
  const sum = rows.reduce((a, r) => a + (parseFloat(r.amount) || 0), 0);
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div class="stat-label">Total logged</div>
      <div class="stat-value" style="font-size:28px;">₦${sum.toLocaleString()}</div>
    </div>
    <div class="invoice-grid">
      ${rows
        .map(
          (r, i) => `
        <div class="invoice-card">
          <div class="invoice-info">
            <h3>${escapeHtml(r.title)}</h3>
            <div class="invoice-meta">${new Date(r.at).toLocaleDateString()} · ${escapeHtml(r.category || '')}</div>
          </div>
          <div class="invoice-amount">₦${parseFloat(r.amount).toLocaleString()}</div>
          <div class="invoice-actions">
            <button type="button" class="btn btn-ghost btn-sm" onclick="removeExpense(${i})">Remove</button>
          </div>
        </div>`
        )
        .join('')}
    </div>`;
}

function submitExpense(ev) {
  ev.preventDefault();
  const title = document.getElementById('exp-title').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
  const category = document.getElementById('exp-cat').value.trim();
  if (!title) {
    showToast('Title required', 'error');
    return;
  }
  const rows = loadRows();
  rows.unshift({ title, amount, category, at: Date.now() });
  saveRows(rows);
  ev.target.reset();
  render();
  showToast('Expense saved', 'success');
}

function exportExpensesCSV() {
  const rows = loadRows();
  if (!rows.length) {
    showToast('No expenses', 'error');
    return;
  }
  const head = ['Date', 'Title', 'Category', 'Amount'];
  const lines = rows.map((r) => [new Date(r.at).toISOString(), r.title, r.category, r.amount]);
  const csv = [head.join(','), ...lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported', 'success');
}

function removeExpense(i) {
  const rows = loadRows();
  rows.splice(i, 1);
  saveRows(rows);
  render();
  showToast('Removed', 'info');
}

window.removeExpense = removeExpense;
window.exportExpensesCSV = exportExpensesCSV;

(async () => {
  const u = await requireAuth();
  if (!u) return;
  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });
  document.getElementById('expense-form').addEventListener('submit', submitExpense);
  render();
})();
