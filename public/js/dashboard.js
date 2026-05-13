let currentUser = null;
let dashboardInvoices = [];
let dashboardFiltered = [];
let activityStore = [];
let activeDashboardInvoiceId = null;
const DASH_QUEUE_KEY = 'ni_dash_action_queue_v1';
const DASH_LINK_CACHE_KEY = 'ni_dash_link_cache_v1';

const money = (n) => `₦${Number(n || 0).toLocaleString()}`;

function sparkline(values = []) {
  const width = 96;
  const height = 30;
  if (!values.length) values = [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const points = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - ((v - min) / span) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" class="kpi-sparkline"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}

(async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });

  document.getElementById('dashboard-search')?.addEventListener('input', applyDashboardFilter);
  bindDashboardShortcuts();
  window.addEventListener('online', processDashboardQueue);
  document.getElementById('dashboard-actions-sheet')?.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'dashboard-actions-sheet') closeDashboardActionsSheet();
  });

  await loadDashboard();
  processDashboardQueue();
  if (typeof initOnboarding === 'function') initOnboarding(currentUser);
})();

async function loadDashboard() {
  try {
    showDashboardSkeletons();
    const response = await fetch(`/api/invoices?user_id=${currentUser.id}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (typeof showToast === 'function') showToast(body.error || 'Could not load dashboard', 'error');
      return;
    }

    dashboardInvoices = Array.isArray(body.invoices) ? body.invoices : [];
    dashboardFiltered = [...dashboardInvoices];

    renderKpis(dashboardInvoices);
    renderActionRequired(dashboardInvoices);
    renderActivityFeed(dashboardInvoices);
    renderInvoiceTable(dashboardInvoices);
  } catch (err) {
    console.error(err);
  }
}

function showDashboardSkeletons() {
  const kpiRoot = document.getElementById('kpi-grid');
  const actionRoot = document.getElementById('action-required-list');
  const activityRoot = document.getElementById('activity-feed');
  const recentRoot = document.getElementById('recent-invoices-table');
  const recentMobileRoot = document.getElementById('recent-invoices-mobile');
  if (kpiRoot) {
    kpiRoot.innerHTML = new Array(4).fill('<article class="finops-kpi-card skeleton-block"></article>').join('');
  }
  if (actionRoot) {
    actionRoot.innerHTML = new Array(3).fill('<div class="finops-action-row skeleton-row"></div>').join('');
  }
  if (activityRoot) {
    activityRoot.innerHTML = new Array(4).fill('<div class="skeleton-row" style="height:44px"></div>').join('');
  }
  if (recentRoot) {
    recentRoot.innerHTML = '<tr><td colspan="7" class="empty-cell">Loading invoices...</td></tr>';
  }
  if (recentMobileRoot) {
    recentMobileRoot.innerHTML = new Array(3).fill('<div class="skeleton-row" style="height:88px;margin-bottom:8px;"></div>').join('');
  }
}

function applyDashboardFilter() {
  const q = (document.getElementById('dashboard-search')?.value || '').trim().toLowerCase();
  if (!q) {
    dashboardFiltered = [...dashboardInvoices];
  } else {
    dashboardFiltered = dashboardInvoices.filter((inv) =>
      String(inv.invoice_number || '').toLowerCase().includes(q) ||
      String(inv.clients?.client_name || '').toLowerCase().includes(q) ||
      String(inv.total_amount || '').toLowerCase().includes(q)
    );
  }
  renderActionRequired(dashboardFiltered);
  renderInvoiceTable(dashboardFiltered);
}

function buildWeeklySeries(invoices, predicate) {
  const now = new Date();
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayTotal = invoices
      .filter((inv) => String(inv.invoice_date || '').slice(0, 10) === key)
      .filter(predicate)
      .reduce((s, inv) => s + Number(inv.total_amount || 0), 0);
    out.push(dayTotal);
  }
  return out;
}

function pctChange(current, previous) {
  if (!previous) return current ? '+100%' : '0%';
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function renderKpis(invoices) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const outstanding = invoices.filter((i) => ['sent', 'overdue', 'viewed'].includes(i.status)).reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const collectedMonth = invoices.filter((i) => i.status === 'paid').filter((i) => {
    const d = new Date(i.invoice_date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const dueWeek = invoices.filter((i) => {
    if (!i.due_date || i.status === 'paid') return false;
    const d = new Date(i.due_date + 'T00:00:00');
    const days = Math.ceil((d - now) / 86400000);
    return days >= 0 && days <= 7;
  }).reduce((s, i) => s + Number(i.total_amount || 0), 0);

  const prevMonth = new Date(thisYear, thisMonth - 1, 1);
  const prevCollected = invoices.filter((i) => i.status === 'paid').filter((i) => {
    const d = new Date(i.invoice_date);
    return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
  }).reduce((s, i) => s + Number(i.total_amount || 0), 0);

  const cards = [
    { title: 'Outstanding Revenue', value: outstanding, change: pctChange(outstanding, prevCollected || 1), className: 'kpi-critical', spark: buildWeeklySeries(invoices, (i) => ['sent','overdue','viewed'].includes(i.status)) },
    { title: 'Collected This Month', value: collectedMonth, change: pctChange(collectedMonth, prevCollected), className: 'kpi-positive', spark: buildWeeklySeries(invoices, (i) => i.status === 'paid') },
    { title: 'Overdue Amount', value: overdue, change: overdue > 0 ? 'Action needed' : 'Healthy', className: 'kpi-overdue', spark: buildWeeklySeries(invoices, (i) => i.status === 'overdue') },
    { title: 'Due This Week', value: dueWeek, change: dueWeek > 0 ? 'Upcoming' : 'Clear', className: 'kpi-neutral', spark: buildWeeklySeries(invoices, (i) => Boolean(i.due_date)) }
  ];

  const root = document.getElementById('kpi-grid');
  root.innerHTML = cards.map((c) => `
    <article class="finops-kpi-card ${c.className}">
      <div class="kpi-head"><span>${c.title}</span><small>${c.change}</small></div>
      <div class="kpi-value">${money(c.value)}</div>
      <div class="kpi-spark">${sparkline(c.spark)}</div>
    </article>
  `).join('');
}

function getActionRows(invoices) {
  const now = new Date();
  return invoices.filter((inv) => {
    const due = inv.due_date ? new Date(inv.due_date + 'T00:00:00') : null;
    const daysOld = Math.ceil((now - new Date(inv.invoice_date)) / 86400000);
    const dueSoon = due ? Math.ceil((due - now) / 86400000) <= 3 && Math.ceil((due - now) / 86400000) >= 0 : false;
    const viewedUnpaid = !!inv.viewed_at && inv.status !== 'paid';
    const unpaidOld = inv.status !== 'paid' && daysOld > 7;
    return inv.status === 'overdue' || dueSoon || viewedUnpaid || unpaidOld;
  }).slice(0, 8);
}

function renderActionRequired(invoices) {
  const root = document.getElementById('action-required-list');
  const rows = getActionRows(invoices);
  if (!rows.length) {
    root.innerHTML = '<p class="message">No urgent follow-up right now.</p>';
    return;
  }

  root.innerHTML = rows.map((inv) => {
    const dueText = inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'No due date';
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    return `
      <div class="finops-action-row">
        <div class="finops-action-main">
          <strong>${inv.invoice_number}</strong>
          <div class="finops-row-sub">${inv.clients?.client_name || 'N/A'} · ${money(inv.total_amount)}</div>
        </div>
        <span class="finops-due-chip ${inv.status === 'overdue' ? 'is-overdue' : ''}">${inv.status.toUpperCase()} · ${dueText}</span>
        <div class="finops-row-actions">
          ${isMobile
            ? `<button class="btn btn-primary btn-sm" onclick="viewInvoicePublic('${inv.id}')">Open Invoice</button>
               <button class="btn btn-ghost btn-sm icon-only-btn" onclick="openDashboardActionsSheet('${inv.id}')" aria-label="More actions">⋯</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="sendWhatsappReminder('${inv.id}')">Send WhatsApp Reminder</button>
               <button class="btn btn-ghost btn-sm" onclick="copyInvoiceLink('${inv.id}')">Copy Invoice Link</button>
               <button class="btn btn-ghost btn-sm" onclick="markAsPaid('${inv.id}')">Mark As Paid</button>
               <button class="btn btn-ghost btn-sm" onclick="viewInvoicePublic('${inv.id}')">View Invoice</button>`
          }
        </div>
      </div>
    `;
  }).join('');
  renderMobileActionBar(rows);
}

function renderMobileActionBar(rows) {
  const bar = document.getElementById('mobile-action-bar');
  if (!bar) return;
  const count = rows.length;
  bar.style.display = count ? 'flex' : 'none';
  bar.innerHTML = `
    <strong>${count} pending</strong>
    <button class="btn btn-secondary btn-sm" onclick="window.location.href='invoices.html?filter=overdue'">Open Queue</button>
    <button class="btn btn-ghost btn-sm" onclick="window.location.href='create-invoice.html'">New Invoice</button>
  `;
}

function renderActivityFeed(invoices) {
  const root = document.getElementById('activity-feed');
  const generated = [];
  invoices.slice(0, 20).forEach((inv) => {
    generated.push({ ts: inv.created_at || inv.invoice_date, text: `Invoice ${inv.invoice_number} created`, type: 'created' });
    if (inv.viewed_at) generated.push({ ts: inv.viewed_at, text: `${inv.invoice_number} viewed by ${inv.clients?.client_name || 'client'}`, type: 'viewed' });
    if (inv.status === 'paid') generated.push({ ts: inv.payment_date || inv.updated_at || inv.invoice_date, text: `Payment received for ${inv.invoice_number}`, type: 'paid' });
  });
  const combined = [...generated, ...activityStore].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 14);

  root.innerHTML = combined.length ? combined.map((item) => `
    <div class="finops-activity-item">
      <span class="dot dot-${item.type}"></span>
      <div><p>${item.text}</p><small>${new Date(item.ts).toLocaleString()}</small></div>
    </div>
  `).join('') : '<p class="message">No activity yet.</p>';
}

function statusLabel(inv) {
  if (inv.status === 'sent' && inv.viewed_at) return 'Viewed';
  if (inv.status === 'paid') return 'Paid';
  if (inv.status === 'draft') return 'Draft';
  if (inv.status === 'overdue') return 'Overdue';
  return 'Sent';
}

function renderInvoiceTable(invoices) {
  const tbody = document.getElementById('recent-invoices-table');
  const mobileRoot = document.getElementById('recent-invoices-mobile');
  if (!invoices.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No invoices to show</td></tr>';
    if (mobileRoot) mobileRoot.innerHTML = '<div class="empty-cell">No invoices to show</div>';
    return;
  }

  tbody.innerHTML = invoices.slice(0, 10).map((inv) => {
    const label = statusLabel(inv);
    const badgeClass = label.toLowerCase().replace(' ', '-');
    return `
      <tr>
        <td>${inv.invoice_number}</td>
        <td>${inv.clients?.client_name || 'N/A'}</td>
        <td><span class="status-badge status-${badgeClass}">${label}</span></td>
        <td>${money(inv.total_amount)}</td>
        <td>${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
        <td>${inv.viewed_at ? 'Yes' : 'No'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm" onclick="sendWhatsappReminder('${inv.id}')">WA</button>
            <button class="btn btn-ghost btn-sm" onclick="copyInvoiceLink('${inv.id}')">Copy</button>
            <a class="btn btn-ghost btn-sm" href="/api/invoices/${inv.id}/pdf" target="_blank">PDF</a>
            <button class="btn btn-ghost btn-sm" onclick="markAsPaid('${inv.id}')">Paid</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (mobileRoot) {
    mobileRoot.innerHTML = invoices.slice(0, 8).map((inv) => {
      const label = statusLabel(inv);
      const badgeClass = label.toLowerCase().replace(' ', '-');
      return `
        <article class="mobile-invoice-card">
          <div class="mobile-invoice-head">
            <strong>${inv.invoice_number}</strong>
            <span class="status-badge status-${badgeClass}">${label}</span>
          </div>
          <p class="mobile-amount">${money(inv.total_amount)}</p>
          <p class="page-subtitle">${inv.clients?.client_name || 'N/A'} · Due ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
          <div class="mobile-card-footer">
            <button class="btn btn-primary btn-sm" onclick="viewInvoicePublic('${inv.id}')">Open Invoice</button>
            <button class="btn btn-ghost btn-sm icon-only-btn" onclick="openDashboardActionsSheet('${inv.id}')" aria-label="More actions">⋯</button>
          </div>
        </article>
      `;
    }).join('');
  }
}

function openDashboardActionsSheet(invoiceId) {
  activeDashboardInvoiceId = invoiceId;
  const sheet = document.getElementById('dashboard-actions-sheet');
  if (!sheet) return;
  sheet.style.display = 'flex';
}

function closeDashboardActionsSheet() {
  const sheet = document.getElementById('dashboard-actions-sheet');
  if (sheet) sheet.style.display = 'none';
  activeDashboardInvoiceId = null;
}

function runDashboardSheetAction(action) {
  if (!activeDashboardInvoiceId) return;
  const id = activeDashboardInvoiceId;
  closeDashboardActionsSheet();
  if (action === 'whatsapp') return sendWhatsappReminder(id);
  if (action === 'copy') return copyInvoiceLink(id);
  if (action === 'paid') return markAsPaid(id);
  if (action === 'pdf') return window.open(`/api/invoices/${id}/pdf`, '_blank', 'noopener');
  if (action === 'delete') return deleteDashboardInvoice(id);
}

async function deleteDashboardInvoice(invoiceId) {
  if (!confirm('Delete this invoice?')) return;
  try {
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Could not delete invoice');
    dashboardInvoices = dashboardInvoices.filter((inv) => inv.id !== invoiceId);
    applyDashboardFilter();
    renderKpis(dashboardInvoices);
    renderActivityFeed(dashboardInvoices);
    if (typeof showToast === 'function') showToast('Invoice deleted', 'success');
  } catch (err) {
    if (typeof showToast === 'function') showToast(err.message, 'error');
  }
}

async function ensurePublicLink(invoiceId) {
  const cache = dashLinkCache();
  if (cache[invoiceId]) return cache[invoiceId];
  const res = await fetch(`/api/invoices/${invoiceId}/public-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.id })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not generate link');
  cache[invoiceId] = body.public_url;
  localStorage.setItem(DASH_LINK_CACHE_KEY, JSON.stringify(cache));
  return body.public_url;
}

async function copyInvoiceLink(invoiceId) {
  try {
    const link = await ensurePublicLink(invoiceId);
    await navigator.clipboard.writeText(link);
    if (typeof window.markInvoiceShared === 'function') window.markInvoiceShared();
    activityStore.unshift({ ts: new Date().toISOString(), text: 'Invoice link copied', type: 'reminder' });
    if (typeof showToast === 'function') showToast('Invoice link copied', 'success');
    renderActivityFeed(dashboardInvoices);
  } catch (err) {
    enqueueDashAction({ type: 'prepare_link', invoiceId });
    if (typeof showToast === 'function') showToast(err.message, 'error');
  }
}

async function sendWhatsappReminder(invoiceId) {
  try {
    const link = await ensurePublicLink(invoiceId);
    const inv = dashboardInvoices.find((i) => i.id === invoiceId);
    const name = inv?.clients?.client_name || 'there';
    const amount = money(inv?.total_amount || 0);
    const number = inv?.invoice_number || 'your invoice';
    const due = inv?.due_date ? new Date(inv.due_date).toLocaleDateString() : 'No due date';
    const message = `Hello ${name},

This is a friendly reminder for invoice ${number}.
Amount due: ${amount}
Due date: ${due}

View invoice: ${link}

Thank you.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    if (typeof window.markInvoiceShared === 'function') window.markInvoiceShared();
    activityStore.unshift({ ts: new Date().toISOString(), text: `Reminder sent for ${inv?.invoice_number || 'invoice'}`, type: 'reminder' });
    if (typeof showToast === 'function') showToast('WhatsApp reminder opened', 'success');
    renderActivityFeed(dashboardInvoices);
  } catch (err) {
    enqueueDashAction({ type: 'prepare_link', invoiceId });
    if (typeof showToast === 'function') showToast(err.message, 'error');
  }
}

async function viewInvoicePublic(invoiceId) {
  try {
    const link = await ensurePublicLink(invoiceId);
    window.open(link, '_blank', 'noopener');
  } catch (err) {
    if (typeof showToast === 'function') showToast(err.message, 'error');
  }
}

async function markAsPaid(invoiceId) {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      enqueueDashAction({ type: 'mark_paid', invoiceId });
      throw new Error(body.error || 'Could not mark paid');
    }

    const idx = dashboardInvoices.findIndex((i) => i.id === invoiceId);
    if (idx >= 0) {
      dashboardInvoices[idx] = { ...dashboardInvoices[idx], ...body.invoice, status: 'paid' };
    }
    activityStore.unshift({ ts: new Date().toISOString(), text: `Marked ${body.invoice?.invoice_number || 'invoice'} as paid`, type: 'paid' });
    applyDashboardFilter();
    renderKpis(dashboardInvoices);
    renderActivityFeed(dashboardInvoices);
    if (typeof showToast === 'function') showToast('Invoice marked as paid', 'success');
  } catch (err) {
    if (typeof showToast === 'function') showToast(err.message, 'error');
  }
}

function bindDashboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('dashboard-search')?.focus();
    }
    if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      window.location.href = 'create-invoice.html';
    }
  });
}

function readDashQueue() {
  try { return JSON.parse(localStorage.getItem(DASH_QUEUE_KEY) || '[]'); } catch { return []; }
}

function writeDashQueue(rows) {
  localStorage.setItem(DASH_QUEUE_KEY, JSON.stringify(rows.slice(0, 40)));
}

function enqueueDashAction(action) {
  const q = readDashQueue();
  q.push({ ...action, ts: Date.now() });
  writeDashQueue(q);
}

function dashLinkCache() {
  try { return JSON.parse(localStorage.getItem(DASH_LINK_CACHE_KEY) || '{}'); } catch { return {}; }
}

async function processDashboardQueue() {
  if (!navigator.onLine || !currentUser) return;
  const q = readDashQueue();
  if (!q.length) return;
  const remain = [];
  for (const action of q) {
    try {
      if (action.type === 'prepare_link') {
        await ensurePublicLink(action.invoiceId);
      } else if (action.type === 'mark_paid') {
        const r = await fetch(`/api/invoices/${action.invoiceId}/mark-paid`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUser.id })
        });
        if (!r.ok) throw new Error('retry failed');
      }
    } catch {
      remain.push(action);
    }
  }
  writeDashQueue(remain);
  if (q.length !== remain.length && typeof showToast === 'function') {
    showToast('Pending actions synced.', 'success');
    loadDashboard();
  }
}

window.copyInvoiceLink = copyInvoiceLink;
window.sendWhatsappReminder = sendWhatsappReminder;
window.markAsPaid = markAsPaid;
window.viewInvoicePublic = viewInvoicePublic;
window.openDashboardActionsSheet = openDashboardActionsSheet;
window.closeDashboardActionsSheet = closeDashboardActionsSheet;
window.runDashboardSheetAction = runDashboardSheetAction;
