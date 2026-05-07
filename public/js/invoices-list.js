let currentUser = null;
let allInvoices = [];
let filteredInvoices = [];
let selectedIds = new Set();
const SAVED_FILTERS_KEY = 'ni_saved_invoice_filters_v2';
const RECENT_SEARCHES_KEY = 'ni_recent_invoice_searches_v1';
const ACTION_QUEUE_KEY = 'ni_action_queue_v1';
const LINK_CACHE_KEY = 'ni_link_cache_v1';

const money = (inv) => {
  const code = (inv.currency || 'NGN').toUpperCase();
  const map = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵', KES: 'KSh' };
  return `${map[code] || code + ' '}${Number(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

(async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });

  document.getElementById('search-invoices').addEventListener('input', applyFilters);
  document.getElementById('search-invoices').addEventListener('focus', renderRecentSearches);
  document.getElementById('voice-search-btn')?.addEventListener('click', startVoiceSearch);
  bindInvoiceShortcuts();
  loadSavedFilters();
  applyInitialFilterFromQuery();
  renderRecentSearches();
  window.addEventListener('online', processActionQueue);
  await loadInvoices();
  processActionQueue();
})();

async function loadInvoices() {
  showInvoicesSkeleton();
  const res = await fetch(`/api/invoices?user_id=${currentUser.id}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (typeof showToast === 'function') showToast(body.error || 'Could not load invoices', 'error');
    return;
  }
  allInvoices = Array.isArray(body.invoices) ? body.invoices : [];
  applyFilters();
}

function showInvoicesSkeleton() {
  const body = document.getElementById('invoices-table-body');
  const mobile = document.getElementById('invoices-mobile-list');
  if (!body) return;
  body.innerHTML = new Array(5).fill('<tr><td colspan="8"><div class="skeleton-row" style="height:28px"></div></td></tr>').join('');
  if (mobile) {
    mobile.innerHTML = new Array(4).fill('<div class="skeleton-row" style="height:84px;margin-bottom:8px;"></div>').join('');
  }
}

function normalizeStatus(inv) {
  if (inv.status === 'sent' && inv.viewed_at) return 'viewed';
  return inv.status;
}

function applyFilters() {
  const q = (document.getElementById('search-invoices').value || '').trim().toLowerCase();
  const status = document.getElementById('status-filter').value;
  const sort = document.getElementById('sort-by').value;

  filteredInvoices = allInvoices.filter((inv) => {
    const statusMatch = !status || normalizeStatus(inv) === status;
    const queryMatch = !q ||
      String(inv.invoice_number || '').toLowerCase().includes(q) ||
      String(inv.clients?.client_name || '').toLowerCase().includes(q) ||
      String(inv.total_amount || '').toLowerCase().includes(q);
    return statusMatch && queryMatch;
  });

  if (sort === 'date-desc') filteredInvoices.sort((a,b)=>new Date(b.invoice_date)-new Date(a.invoice_date));
  if (sort === 'date-asc') filteredInvoices.sort((a,b)=>new Date(a.invoice_date)-new Date(b.invoice_date));
  if (sort === 'amount-desc') filteredInvoices.sort((a,b)=>Number(b.total_amount)-Number(a.total_amount));
  if (sort === 'amount-asc') filteredInvoices.sort((a,b)=>Number(a.total_amount)-Number(b.total_amount));

  renderTable();
  if (q.length > 1) saveRecentSearch(q);
}

function renderTable() {
  const body = document.getElementById('invoices-table-body');
  const mobile = document.getElementById('invoices-mobile-list');
  if (!filteredInvoices.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty-cell">No invoices match current filters.</td></tr>';
    if (mobile) mobile.innerHTML = '<div class="empty-cell">No invoices match current filters.</div>';
    updateBulkBar();
    return;
  }

  body.innerHTML = filteredInvoices.map((inv) => {
    const normStatus = normalizeStatus(inv);
    const viewed = inv.viewed_at ? new Date(inv.viewed_at).toLocaleString() : 'No';
    return `
      <tr class="swipe-row" data-id="${inv.id}">
        <td><input type="checkbox" ${selectedIds.has(inv.id) ? 'checked' : ''} onchange="toggleSelect('${inv.id}', this.checked)"></td>
        <td>${inv.invoice_number}</td>
        <td>${inv.clients?.client_name || 'N/A'}</td>
        <td><span class="status-badge status-${normStatus}">${normStatus.toUpperCase()}</span></td>
        <td>${viewed}</td>
        <td>${money(inv)}</td>
        <td>${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm" onclick="shareViaWhatsApp('${inv.id}')">WA</button>
            <button class="btn btn-ghost btn-sm" onclick="copyInvoiceLink('${inv.id}')">Copy</button>
            <a class="btn btn-ghost btn-sm" href="/api/invoices/${inv.id}/pdf" target="_blank">PDF</a>
            <button class="btn btn-ghost btn-sm" onclick="markAsPaid('${inv.id}')">Paid</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (mobile) {
    mobile.innerHTML = filteredInvoices.map((inv) => {
      const normStatus = normalizeStatus(inv);
      return `
      <article class="mobile-invoice-card swipe-row" data-id="${inv.id}">
        <div class="mobile-invoice-head">
          <strong>${inv.clients?.client_name || 'N/A'}</strong>
          <span class="status-badge status-${normStatus}">${normStatus.toUpperCase()}</span>
        </div>
        <p class="mobile-amount">${money(inv)}</p>
        <p class="page-subtitle">Invoice ${inv.invoice_number} · Due ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'} · Viewed ${inv.viewed_at ? 'Yes' : 'No'}</p>
        <div class="mobile-invoice-actions">
          <button class="btn btn-ghost btn-sm" onclick="shareViaWhatsApp('${inv.id}')">Share</button>
          <button class="btn btn-ghost btn-sm" onclick="copyInvoiceLink('${inv.id}')">Copy</button>
          <button class="btn btn-ghost btn-sm" onclick="markAsPaid('${inv.id}')">Paid</button>
          <button class="btn btn-ghost btn-sm" onclick="duplicateInvoice('${inv.id}')">Duplicate</button>
          <button class="btn btn-text btn-danger btn-sm" onclick="deleteInvoice('${inv.id}')">Delete</button>
          <a class="btn btn-ghost btn-sm" href="/api/invoices/${inv.id}/pdf" target="_blank">PDF</a>
        </div>
      </article>
      `;
    }).join('');
  }

  initSwipeRows();
  updateBulkBar();
}

function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id); else selectedIds.delete(id);
  updateBulkBar();
}

function toggleSelectAll(checked) {
  if (checked) filteredInvoices.forEach((i)=>selectedIds.add(i.id));
  else filteredInvoices.forEach((i)=>selectedIds.delete(i.id));
  renderTable();
}

function clearSelection() {
  selectedIds.clear();
  renderTable();
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  const count = selectedIds.size;
  document.getElementById('bulk-count').textContent = `${count} selected`;
  bar.style.display = count ? 'flex' : 'none';
}

async function ensurePublicLink(invoiceId) {
  const cached = linkCache()[invoiceId];
  if (cached) return cached;
  const res = await fetch(`/api/invoices/${invoiceId}/public-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.id })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not create link');
  cacheLink(invoiceId, body.public_url);
  return body.public_url;
}

async function shareViaWhatsApp(invoiceId) {
  try {
    const link = await ensurePublicLink(invoiceId);
    const inv = allInvoices.find((i)=>i.id===invoiceId);
    const msg = `Hi ${inv?.clients?.client_name || 'there'},
Here is invoice ${inv?.invoice_number || ''}.
Amount: ${money(inv || {})}
Due: ${inv?.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    if (typeof window.markInvoiceShared === 'function') window.markInvoiceShared();
  } catch (e) {
    enqueueAction({ type: 'prepare_link', invoiceId });
    if (typeof showToast === 'function') showToast(e.message, 'error');
  }
}

async function copyInvoiceLink(invoiceId) {
  try {
    const link = await ensurePublicLink(invoiceId);
    await navigator.clipboard.writeText(link);
    if (typeof window.markInvoiceShared === 'function') window.markInvoiceShared();
    if (typeof showToast === 'function') showToast('Invoice link copied', 'success');
  } catch (e) {
    enqueueAction({ type: 'prepare_link', invoiceId });
    if (typeof showToast === 'function') showToast(e.message, 'error');
  }
}

async function markAsPaid(invoiceId) {
  const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.id })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    enqueueAction({ type: 'mark_paid', invoiceId });
    if (typeof showToast === 'function') showToast(body.error || 'Could not update invoice', 'error');
    return;
  }
  await loadInvoices();
  if (typeof showToast === 'function') showToast('Invoice marked paid', 'success');
}

async function duplicateInvoice(invoiceId) {
  const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.id })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (typeof showToast === 'function') showToast(body.error || 'Could not duplicate invoice', 'error');
    return;
  }
  if (typeof showToast === 'function') showToast('Invoice duplicated', 'success');
  await loadInvoices();
}

async function deleteInvoice(invoiceId) {
  if (!confirm('Delete this invoice?')) return;
  const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (typeof showToast === 'function') showToast(body.error || 'Could not delete invoice', 'error');
    return;
  }
  if (typeof showToast === 'function') showToast('Invoice deleted', 'success');
  await loadInvoices();
}

async function bulkMarkPaid() {
  const ids = Array.from(selectedIds);
  for (const id of ids) {
    await markAsPaid(id);
  }
  clearSelection();
}

async function bulkWhatsapp() {
  const first = Array.from(selectedIds)[0];
  if (!first) return;
  await shareViaWhatsApp(first);
}

function exportToCSV() {
  if (!allInvoices.length) return;
  const headers = ['Invoice Number','Client','Status','Viewed','Amount','Due Date'];
  const rows = allInvoices.map((inv) => [
    inv.invoice_number,
    inv.clients?.client_name || 'N/A',
    normalizeStatus(inv),
    inv.viewed_at ? 'Yes' : 'No',
    Number(inv.total_amount || 0).toFixed(2),
    inv.due_date || 'N/A'
  ]);
  const csv = [headers.join(','), ...rows.map((r)=>r.map((c)=>`"${String(c).replace(/"/g,'""')}"`).join(','))].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function savedFilters() {
  try { return JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY) || '[]'); } catch { return []; }
}

function loadSavedFilters() {
  const select = document.getElementById('saved-filter');
  const filters = savedFilters();
  select.innerHTML = '<option value="">Saved Filters</option>' + filters.map((f,i)=>`<option value="${i}">${f.name}</option>`).join('');
}

function saveCurrentFilter() {
  const name = prompt('Filter name');
  if (!name) return;
  const filters = savedFilters();
  filters.push({
    name,
    search: document.getElementById('search-invoices').value,
    status: document.getElementById('status-filter').value,
    sort: document.getElementById('sort-by').value
  });
  localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
  loadSavedFilters();
}

function applySavedFilter(idx) {
  if (idx === '') return;
  const f = savedFilters()[Number(idx)];
  if (!f) return;
  document.getElementById('search-invoices').value = f.search || '';
  document.getElementById('status-filter').value = f.status || '';
  document.getElementById('sort-by').value = f.sort || 'date-desc';
  applyFilters();
}

function openFiltersSheet() {
  const sheet = document.getElementById('filters-sheet');
  if (!sheet) return;
  document.getElementById('sheet-status-filter').value = document.getElementById('status-filter').value;
  document.getElementById('sheet-sort-by').value = document.getElementById('sort-by').value;
  sheet.style.display = 'flex';
}

function closeFiltersSheet() {
  const sheet = document.getElementById('filters-sheet');
  if (sheet) sheet.style.display = 'none';
}

function applySheetFilters() {
  document.getElementById('status-filter').value = document.getElementById('sheet-status-filter').value;
  document.getElementById('sort-by').value = document.getElementById('sheet-sort-by').value;
  applyFilters();
  closeFiltersSheet();
}

function resetSheetFilters() {
  document.getElementById('sheet-status-filter').value = '';
  document.getElementById('sheet-sort-by').value = 'date-desc';
}

function recentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]'); } catch { return []; }
}

function saveRecentSearch(term) {
  const list = recentSearches();
  const cleaned = [term, ...list.filter((x) => x !== term)].slice(0, 6);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(cleaned));
  renderRecentSearches();
}

function renderRecentSearches() {
  const root = document.getElementById('recent-searches');
  if (!root) return;
  const list = recentSearches();
  if (!list.length) {
    root.innerHTML = '';
    return;
  }
  root.innerHTML = list.map((q) => `<button class="btn btn-ghost btn-sm recent-chip" onclick="useRecentSearch('${q.replace(/'/g, "\\'")}')">${q}</button>`).join('');
}

function useRecentSearch(term) {
  document.getElementById('search-invoices').value = term;
  applyFilters();
}

function startVoiceSearch() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    if (typeof showToast === 'function') showToast('Voice search not supported on this device yet.', 'info');
    return;
  }
  const rec = new Recognition();
  rec.lang = 'en-NG';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const spoken = e.results?.[0]?.[0]?.transcript || '';
    document.getElementById('search-invoices').value = spoken;
    applyFilters();
  };
  rec.onerror = () => {
    if (typeof showToast === 'function') showToast('Voice search failed. Try typing instead.', 'error');
  };
  rec.start();
}

function applyInitialFilterFromQuery() {
  const qp = new URLSearchParams(window.location.search);
  const filter = qp.get('filter');
  if (!filter) return;
  const status = document.getElementById('status-filter');
  if (status && [...status.options].some((o) => o.value === filter)) {
    status.value = filter;
  }
}

function bindInvoiceShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('search-invoices')?.focus();
    }
    if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      window.location.href = 'create-invoice.html';
    }
    if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      if (selectedIds.size) {
        bulkMarkPaid();
      } else if (filteredInvoices[0]) {
        markAsPaid(filteredInvoices[0].id);
      }
    }
  });
}

function initSwipeRows() {
  const rows = document.querySelectorAll('.swipe-row');
  rows.forEach((row) => {
    let startX = 0;
    let startY = 0;
    row.ontouchstart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
    row.ontouchend = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dy) > Math.abs(dx)) return;
      const id = row.dataset.id;
      if (dx < -90) deleteInvoice(id);
      else if (dx < -40) shareViaWhatsApp(id);
      else if (dx > 90) duplicateInvoice(id);
      else if (dx > 40) markAsPaid(id);
    };
  });
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(ACTION_QUEUE_KEY) || '[]'); } catch { return []; }
}

function writeQueue(rows) {
  localStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(rows.slice(0, 50)));
}

function enqueueAction(action) {
  const q = readQueue();
  q.push({ ...action, ts: Date.now() });
  writeQueue(q);
}

function linkCache() {
  try { return JSON.parse(localStorage.getItem(LINK_CACHE_KEY) || '{}'); } catch { return {}; }
}

function cacheLink(invoiceId, url) {
  const next = linkCache();
  next[invoiceId] = url;
  localStorage.setItem(LINK_CACHE_KEY, JSON.stringify(next));
}

async function processActionQueue() {
  if (!navigator.onLine || !currentUser) return;
  const q = readQueue();
  if (!q.length) return;
  const remaining = [];
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
      remaining.push(action);
    }
  }
  writeQueue(remaining);
  if (q.length !== remaining.length && typeof showToast === 'function') {
    showToast('Pending offline actions synced.', 'success');
    loadInvoices();
  }
}

window.applyFilters = applyFilters;
window.toggleSelect = toggleSelect;
window.toggleSelectAll = toggleSelectAll;
window.clearSelection = clearSelection;
window.bulkMarkPaid = bulkMarkPaid;
window.bulkWhatsapp = bulkWhatsapp;
window.exportToCSV = exportToCSV;
window.shareViaWhatsApp = shareViaWhatsApp;
window.copyInvoiceLink = copyInvoiceLink;
window.markAsPaid = markAsPaid;
window.saveCurrentFilter = saveCurrentFilter;
window.applySavedFilter = applySavedFilter;
window.duplicateInvoice = duplicateInvoice;
window.deleteInvoice = deleteInvoice;
window.openFiltersSheet = openFiltersSheet;
window.closeFiltersSheet = closeFiltersSheet;
window.applySheetFilters = applySheetFilters;
window.resetSheetFilters = resetSheetFilters;
window.useRecentSearch = useRecentSearch;
