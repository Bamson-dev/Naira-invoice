let currentUser = null;
let clients = [];
let lineItems = [];
let quickMatchedClientId = null;
let lastCreatedInvoice = null;
const DRAFT_KEY = 'ni_invoice_draft_v4';
let dragSourceId = null;
let loadingTicker = null;

function getCurrencyMeta() {
  const el = document.getElementById('currency-select');
  const code = (el && el.value) || 'NGN';
  const map = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵', KES: 'KSh' };
  return { code, sym: map[code] || code + ' ' };
}

function fmtMoney(n) {
  const { sym, code } = getCurrencyMeta();
  const num = typeof n === 'number' ? n : parseFloat(n) || 0;
  const opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  if (['USD', 'EUR', 'GBP'].includes(code)) {
    return sym + num.toLocaleString(undefined, opts);
  }
  return sym + num.toLocaleString(undefined, opts);
}

function showInvoiceStatus(text, type = 'success') {
  const el = document.getElementById('invoice-status');
  if (!el) {
    console.log('[Invoice]', type, text);
    return;
  }
  if (!text) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'block';
  el.textContent = text;
  el.className = 'message ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
}

function setButtonLoadingState(btn, loading, text = 'Generate Invoice') {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.prevText = btn.textContent;
    btn.textContent = text;
    btn.classList.add('loading');
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.prevText || 'Generate Invoice';
    btn.classList.remove('loading');
  }
}

function setGeneratingState(loading, mode = 'quick') {
  const quickTop = document.getElementById('quick-generate-btn');
  const quickBottom = document.getElementById('quick-generate-btn-expanded');
  const savedBtn = document.getElementById('create-invoice-btn');
  const mobileBtn = document.getElementById('mobile-generate-btn');

  if (!loading) {
    setButtonLoadingState(quickTop, false);
    setButtonLoadingState(quickBottom, false);
    setButtonLoadingState(savedBtn, false);
    setButtonLoadingState(mobileBtn, false);
    if (loadingTicker) {
      clearInterval(loadingTicker);
      loadingTicker = null;
    }
    return;
  }

  const label = mode === 'saved' ? 'Generating invoice…' : 'Creating quick invoice…';
  const targetButtons = mode === 'saved' ? [savedBtn, mobileBtn] : [quickTop, quickBottom, mobileBtn];
  targetButtons.forEach((btn) => setButtonLoadingState(btn, true, label));

  // Keeps users informed for slower network/database moments.
  const steps = ['Checking details…', 'Creating invoice…', 'Preparing share options…'];
  let idx = 0;
  showInvoiceStatus(steps[idx], 'info');
  if (loadingTicker) clearInterval(loadingTicker);
  loadingTicker = setInterval(() => {
    idx = (idx + 1) % steps.length;
    showInvoiceStatus(steps[idx], 'info');
  }, 1400);
}

(async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });

  loadClients();
  addLineItem();
  wireCreateFlow();
  wireQuickInputs();
  wireTemplateLivePreview();
  wireMoreOptionsCtaPosition();

  if (typeof initOnboarding === 'function') {
    initOnboarding(currentUser);
  }

  calculateTotals();
  restoreDraft();
  bindDraftAutosave();
})();

function savedSuggestions() {
  try { return JSON.parse(localStorage.getItem('ni_line_item_suggestions') || '[]'); } catch { return []; }
}

function saveSuggestions(items) {
  localStorage.setItem('ni_line_item_suggestions', JSON.stringify(items.slice(0, 25)));
}

function wireCreateFlow() {
  const select = document.getElementById('create-flow-select');
  if (!select) return;
  const apply = () => {
    const quick = select.value === 'quick';
    document.getElementById('quick-flow').style.display = quick ? 'block' : 'none';
    document.getElementById('saved-flow').style.display = quick ? 'none' : 'block';
    const mobileBtn = document.getElementById('mobile-generate-btn');
    if (mobileBtn) {
      mobileBtn.onclick = quick ? createQuickInvoice : saveInvoice;
      mobileBtn.textContent = 'Generate Invoice';
    }
  };
  select.addEventListener('change', () => {
    apply();
    saveDraft();
  });
  apply();
}

async function loadClients() {
  try {
    const response = await fetch(`/api/clients?user_id=${currentUser.id}`);
    const { clients: clientsData } = await response.json();
    clients = clientsData;

    const select = document.getElementById('client-select');
    if (select) {
      select.innerHTML = '<option value="">Select a client</option>' +
        clients.map(c => `<option value="${c.id}">${c.client_name}</option>`).join('');
    }
    const list = document.getElementById('quick-client-suggestions');
    if (list) {
      list.innerHTML = clients.map((c) => `<option value="${c.client_name}"></option>`).join('');
    }
  } catch (error) {
    console.error('Load clients error:', error);
  }
}

function wireQuickInputs() {
  const clientName = document.getElementById('quick-client-name');
  const desc = document.getElementById('quick-description');
  const amount = document.getElementById('quick-amount');
  if (clientName) {
    clientName.addEventListener('input', () => {
      detectExistingClient(clientName.value);
      saveDraft();
    });
    clientName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        desc?.focus();
      }
    });
  }
  if (desc) {
    desc.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        amount?.focus();
      }
    });
    desc.addEventListener('input', saveDraft);
  }
  if (amount) amount.addEventListener('input', () => {
    const mt = document.getElementById('mobile-total');
    if (mt) mt.textContent = fmtMoney(parseFloat(amount.value || 0));
    saveDraft();
  });
}

function wireTemplateLivePreview() {
  const select = document.getElementById('template-style');
  if (!select) return;
  select.addEventListener('change', saveDraft);
}

function wireMoreOptionsCtaPosition() {
  const details = document.getElementById('quick-more-options');
  const topBtn = document.getElementById('quick-generate-btn');
  const bottomBtn = document.getElementById('quick-generate-btn-expanded');
  if (!details || !topBtn || !bottomBtn) return;
  const sync = () => {
    const isOpen = details.open;
    topBtn.style.display = isOpen ? 'none' : 'inline-flex';
    bottomBtn.style.display = isOpen ? 'inline-flex' : 'none';
  };
  details.addEventListener('toggle', sync);
  sync();
}

function detectExistingClient(name) {
  const matchEl = document.getElementById('quick-client-match');
  const val = String(name || '').trim().toLowerCase();
  if (!val) {
    quickMatchedClientId = null;
    if (matchEl) matchEl.textContent = '';
    return;
  }
  const found = clients.find((c) => String(c.client_name || '').toLowerCase() === val)
    || clients.find((c) => String(c.client_name || '').toLowerCase().includes(val));
  quickMatchedClientId = found ? found.id : null;
  if (matchEl) {
    matchEl.textContent = found ? `Use existing client? ${found.client_name}` : 'Will create as temporary client for this invoice only.';
  }
}

function addLineItem() {
  const item = {
    id: Date.now(),
    description: '',
    quantity: 1,
    unit_price: 0
  };

  lineItems.push(item);
  renderLineItems();
  saveDraft();
}

function removeLineItem(id) {
  lineItems = lineItems.filter(item => item.id !== id);
  renderLineItems();
  calculateTotals();
}

function duplicateLineItem(id) {
  const found = lineItems.find((x) => x.id === id);
  if (!found) return;
  lineItems.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    description: found.description,
    quantity: found.quantity,
    unit_price: found.unit_price
  });
  renderLineItems();
  calculateTotals();
}

function renderLineItems() {
  const container = document.getElementById('line-items');

  container.innerHTML = lineItems.map((item, index) => `
    <div class="line-item mobile-line-card draggable-line-item" data-id="${item.id}" draggable="true">
      <div class="line-item-row-head">
        <span class="reorder-handle" title="Drag to reorder">≡</span>
        <button type="button" class="btn btn-ghost btn-sm" onclick="duplicateLineItem(${item.id})">Duplicate</button>
      </div>
      <label>Description</label>
      <input type="text" placeholder="Description" value="${item.description}"
        onchange="updateLineItem(${item.id}, 'description', this.value)">
      <label>Quantity</label>
      <input type="number" inputmode="decimal" placeholder="Qty" value="${item.quantity}" min="0" step="0.01"
        onchange="updateLineItem(${item.id}, 'quantity', this.value)">
      <label>Unit Price</label>
      <input type="number" inputmode="decimal" placeholder="Price" value="${item.unit_price}" min="0" step="0.01"
        onchange="updateLineItem(${item.id}, 'unit_price', this.value)">
      <span class="line-total">${fmtMoney(item.quantity * item.unit_price)}</span>
      ${lineItems.length > 1 ? `<button type="button" onclick="removeLineItem(${item.id})" class="btn-remove" aria-label="Remove line">✕</button>` : ''}
    </div>
  `).join('');
  bindLineItemInteractions();
}

function bindLineItemInteractions() {
  const cards = document.querySelectorAll('.draggable-line-item');
  cards.forEach((card) => {
    card.addEventListener('dragstart', () => {
      dragSourceId = Number(card.dataset.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragSourceId = null;
    });
    card.addEventListener('dragover', (e) => e.preventDefault());
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetId = Number(card.dataset.id);
      reorderLineItems(dragSourceId, targetId);
    });

    // Swipe-to-delete (mobile)
    let sx = 0;
    let sy = 0;
    card.addEventListener('touchstart', (e) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    card.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dy) > Math.abs(dx)) return;
      const id = Number(card.dataset.id);
      if (dx < -90 && lineItems.length > 1) {
        removeLineItem(id);
      }
    }, { passive: true });
  });
}

function reorderLineItems(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const from = lineItems.findIndex((x) => x.id === sourceId);
  const to = lineItems.findIndex((x) => x.id === targetId);
  if (from < 0 || to < 0) return;
  const [moved] = lineItems.splice(from, 1);
  lineItems.splice(to, 0, moved);
  renderLineItems();
  calculateTotals();
}

function updateLineItem(id, field, value) {
  const item = lineItems.find(i => i.id === id);
  if (item) {
    item[field] = field === 'description' ? value : parseFloat(value) || 0;
    renderLineItems();
    calculateTotals();
  }
}

function rowsWithDescription() {
  return lineItems.filter((item) => String(item.description || '').trim());
}

function calculateTotals() {
  const subtotal = rowsWithDescription().reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const taxPercentage = parseFloat(document.getElementById('tax-percentage').value) || 0;
  const taxAmount = (subtotal * taxPercentage) / 100;

  const discountValue = parseFloat(document.getElementById('discount-value').value) || 0;
  const discountAmount = discountValue;

  const total = subtotal + taxAmount - discountAmount;

  document.getElementById('subtotal').textContent = fmtMoney(subtotal);
  document.getElementById('tax-amount').textContent = fmtMoney(taxAmount);
  document.getElementById('discount-amount').textContent = fmtMoney(discountAmount);
  document.getElementById('total').textContent = fmtMoney(total);
  const mobileTotal = document.getElementById('mobile-total');
  if (mobileTotal) mobileTotal.textContent = fmtMoney(total);
  saveDraft();
}

async function saveInvoice() {
  const clientId = document.getElementById('client-select').value;
  if (!clientId) {
    showInvoiceStatus('Please select a client.', 'error');
    return;
  }

  const rowsForSave = rowsWithDescription();
  if (rowsForSave.length === 0) {
    showInvoiceStatus('Please add at least one line item with a description.', 'error');
    return;
  }

  const subtotal = rowsForSave.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxPercentage = parseFloat(document.getElementById('tax-percentage').value) || 0;
  const taxAmount = (subtotal * taxPercentage) / 100;
  const discountValue = parseFloat(document.getElementById('discount-value').value) || 0;
  const discountType = discountValue ? 'fixed' : null;
  const discountAmount = discountValue;

  const total = subtotal + taxAmount - discountAmount;

  const invoiceData = {
    user_id: currentUser.id,
    client_id: clientId,
    invoice_type: 'invoice',
    status: 'sent',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: document.getElementById('quick-due-date')?.value || null,
    subtotal: subtotal,
    tax_percentage: taxPercentage || null,
    tax_amount: taxAmount || null,
    discount_type: discountType,
    discount_value: discountValue || null,
    discount_amount: discountAmount || null,
    total_amount: total,
    notes: document.getElementById('notes').value || null,
    payment_method: null,
    payment_date: null,
    invoice_template: document.getElementById('template-style')?.value || 'modern_fintech',
    currency: getCurrencyMeta().code
  };

  const items = rowsForSave.map((item) => ({
    description: String(item.description).trim(),
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price
  }));

  let response = null;
  try {
    setGeneratingState(true, 'saved');
    response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice: invoiceData, items: items })
    });

    const errBody = await response.json().catch(() => ({}));

    if (response.ok) {
      showInvoiceStatus('Invoice created successfully.', 'success');
      if (typeof showToast === 'function') {
        showToast('Invoice created successfully!', 'success');
      }
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('onboarding') === 'true' && typeof checkStepCompletion === 'function') {
        await checkStepCompletion('invoice');
      }
      const suggestions = savedSuggestions();
      rowsForSave.forEach((r) => {
        const key = String(r.description || '').trim().toLowerCase();
        if (!key) return;
        const idx = suggestions.findIndex((x) => String(x.description).trim().toLowerCase() === key);
        const item = { description: String(r.description).trim(), unit_price: Number(r.unit_price || 0) };
        if (idx >= 0) suggestions[idx] = item; else suggestions.unshift(item);
      });
      saveSuggestions(suggestions);
      lastCreatedInvoice = errBody.invoice;
      localStorage.removeItem(DRAFT_KEY);
      openSuccessModal(errBody.invoice, null);
      return;
    }

    showInvoiceStatus(errBody.error || `Could not create invoice (${response.status}).`, 'error');
    if (typeof showToast === 'function') {
      showToast(errBody.error || 'Failed to create invoice', 'error');
    }
    console.error('Create invoice API error:', errBody);
  } catch (error) {
    console.error('Create invoice error:', error);
    showInvoiceStatus('Failed to create invoice (network error).', 'error');
    if (typeof showToast === 'function') {
      showToast('Failed to create invoice', 'error');
    }
  } finally {
    if (!response || !response.ok) setGeneratingState(false);
  }
}

async function createQuickInvoice() {
  const clientName = String(document.getElementById('quick-client-name')?.value || '').trim();
  const amount = parseFloat(document.getElementById('quick-amount')?.value || 0);
  const description = String(document.getElementById('quick-description')?.value || '').trim();
  if (!clientName || !amount || !description) {
    showInvoiceStatus('Client name, amount, and description are required.', 'error');
    return;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const tempClient = {
    client_name: clientName,
    client_email: String(document.getElementById('quick-client-email')?.value || '').trim() || null,
    client_phone: String(document.getElementById('quick-client-phone')?.value || '').trim() || null,
    client_address: String(document.getElementById('quick-client-address')?.value || '').trim() || null
  };
  const taxPercentage = parseFloat(document.getElementById('tax-percentage')?.value || 0) || 0;
  const taxAmount = (amount * taxPercentage) / 100;
  const discountValue = parseFloat(document.getElementById('discount-value')?.value || 0) || 0;
  const total = amount + taxAmount - discountValue;
  const invoiceData = {
    user_id: currentUser.id,
    client_id: quickMatchedClientId || null,
    temp_client_name: quickMatchedClientId ? null : tempClient.client_name,
    temp_client_email: quickMatchedClientId ? null : tempClient.client_email,
    temp_client_phone: quickMatchedClientId ? null : tempClient.client_phone,
    temp_client_address: quickMatchedClientId ? null : tempClient.client_address,
    invoice_type: 'invoice',
    status: 'sent',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: document.getElementById('quick-due-date')?.value || dueDate.toISOString().slice(0, 10),
    subtotal: amount,
    tax_percentage: taxPercentage || null,
    tax_amount: taxAmount,
    discount_type: discountValue ? 'fixed' : null,
    discount_value: discountValue || null,
    discount_amount: discountValue || 0,
    total_amount: total,
    notes: document.getElementById('notes')?.value || 'Thank you for your business.',
    payment_method: null,
    payment_date: null,
    invoice_template: document.getElementById('template-style')?.value || 'modern_fintech',
    currency: getCurrencyMeta().code
  };
  const items = [{ description, quantity: 1, unit_price: amount, line_total: amount }];
  let res = null;
  try {
    setGeneratingState(true, 'quick');
    res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice: invoiceData, items })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      showInvoiceStatus(body.error || 'Could not create quick invoice.', 'error');
      return;
    }
    lastCreatedInvoice = body.invoice;
    if (typeof showToast === 'function') showToast('Invoice created. Share now to get paid faster.', 'success');
    if (typeof checkStepCompletion === 'function') await checkStepCompletion('invoice');
    localStorage.removeItem(DRAFT_KEY);
    openSuccessModal(body.invoice, quickMatchedClientId ? null : tempClient);
  } catch (error) {
    console.error('Quick invoice error:', error);
    showInvoiceStatus('Failed to create invoice (network error).', 'error');
  } finally {
    if (!res || !res.ok) setGeneratingState(false);
  }
}

function draftPayload() {
  return {
    status: 'sent',
    flow: document.getElementById('create-flow-select')?.value || 'quick',
    client_id: document.getElementById('client-select')?.value || '',
    quick_client_name: document.getElementById('quick-client-name')?.value || '',
    quick_description: document.getElementById('quick-description')?.value || '',
    quick_amount: document.getElementById('quick-amount')?.value || '',
    quick_due_date: document.getElementById('quick-due-date')?.value || '',
    quick_client_email: document.getElementById('quick-client-email')?.value || '',
    quick_client_phone: document.getElementById('quick-client-phone')?.value || '',
    quick_client_address: document.getElementById('quick-client-address')?.value || '',
    invoice_template: document.getElementById('template-style')?.value || 'modern_fintech',
    currency: document.getElementById('currency-select')?.value || 'NGN',
    invoice_date: document.getElementById('invoice-date')?.value || '',
    tax_percentage: document.getElementById('tax-percentage')?.value || '0',
    discount_value: document.getElementById('discount-value')?.value || '0',
    notes: document.getElementById('notes')?.value || '',
    items: lineItems
  };
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftPayload()));
  } catch {}
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return;
    if (d.flow && document.getElementById('create-flow-select')) document.getElementById('create-flow-select').value = d.flow;
    wireCreateFlow();
    if (d.currency) document.getElementById('currency-select').value = d.currency;
    if (d.quick_client_name) document.getElementById('quick-client-name').value = d.quick_client_name;
    if (d.quick_description) document.getElementById('quick-description').value = d.quick_description;
    if (d.quick_amount) document.getElementById('quick-amount').value = d.quick_amount;
    if (d.quick_due_date) document.getElementById('quick-due-date').value = d.quick_due_date;
    if (d.quick_client_email) document.getElementById('quick-client-email').value = d.quick_client_email;
    if (d.quick_client_phone) document.getElementById('quick-client-phone').value = d.quick_client_phone;
    if (d.quick_client_address) document.getElementById('quick-client-address').value = d.quick_client_address;
    if (d.invoice_template && document.getElementById('template-style')) {
      document.getElementById('template-style').value = d.invoice_template;
    }
    if (d.tax_percentage != null) document.getElementById('tax-percentage').value = d.tax_percentage;
    if (d.discount_value != null) document.getElementById('discount-value').value = d.discount_value;
    if (d.notes != null) document.getElementById('notes').value = d.notes;
    if (Array.isArray(d.items) && d.items.length) {
      lineItems = d.items.map((it, idx) => ({
        id: Date.now() + idx,
        description: it.description || '',
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0)
      }));
      renderLineItems();
    }
    const trySetClient = () => {
      const sel = document.getElementById('client-select');
      if (!sel || !d.client_id) return;
      if ([...sel.options].some((o) => o.value === d.client_id)) {
        sel.value = d.client_id;
      }
    };
    setTimeout(trySetClient, 250);
    detectExistingClient(d.quick_client_name || '');
    calculateTotals();
  } catch {}
}

function bindDraftAutosave() {
  ['create-flow-select','client-select','currency-select','quick-client-name','quick-description','quick-amount','quick-due-date','quick-client-email','quick-client-phone','quick-client-address','tax-percentage','discount-value','notes']
    .forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', saveDraft);
      el.addEventListener('input', saveDraft);
    });
}

async function ensurePublicLink(invoiceId) {
  const res = await fetch(`/api/invoices/${invoiceId}/public-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.id })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not generate invoice link');
  return body.public_url;
}

function openSuccessModal(invoice, tempClient) {
  const modal = document.getElementById('invoice-success-modal');
  if (!modal || !invoice) return;
  const sub = document.getElementById('success-subtitle');
  if (sub) sub.textContent = `Invoice ${invoice.invoice_number || ''} is ready.`;
  const savePrompt = document.getElementById('save-client-prompt');
  if (savePrompt) savePrompt.style.display = tempClient && tempClient.client_name ? 'block' : 'none';
  modal.style.display = 'flex';
  setGeneratingState(false);
  const onBackdropClick = (e) => {
    if (e.target === modal) goToDashboard();
  };
  modal.onclick = onBackdropClick;
  document.onkeydown = (e) => {
    if (e.key === 'Escape') goToDashboard();
  };

  document.getElementById('success-whatsapp-btn').onclick = async () => {
    try {
      const link = await ensurePublicLink(invoice.id);
      const name = tempClient?.client_name || 'there';
      const number = invoice.invoice_number || 'your invoice';
      const amount = fmtMoney(Number(invoice.total_amount || 0));
      const due = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date';
      const msg = `Hello ${name},

Your invoice ${number} is ready.
Amount due: ${amount}
Due date: ${due}

View invoice: ${link}

Thank you.`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      if (typeof window.markInvoiceShared === 'function') window.markInvoiceShared();
    } catch (e) {
      showInvoiceStatus(e.message, 'error');
    }
  };
  document.getElementById('success-copy-btn').onclick = async () => {
    try {
      const link = await ensurePublicLink(invoice.id);
      await navigator.clipboard.writeText(link);
      if (typeof showToast === 'function') showToast('Invoice link copied', 'success');
    } catch (e) {
      showInvoiceStatus(e.message, 'error');
    }
  };
  document.getElementById('success-pdf-btn').onclick = () => {
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank', 'noopener');
  };
  document.getElementById('save-client-now-btn').onclick = async () => {
    if (!tempClient?.client_name) return closeSuccessModal();
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          client_name: tempClient.client_name,
          client_email: tempClient.client_email,
          client_phone: tempClient.client_phone,
          client_address: tempClient.client_address
        })
      });
      if (typeof showToast === 'function') showToast('Client saved', 'success');
    } catch {}
    closeSuccessModal();
  };
}

function closeSuccessModal() {
  const modal = document.getElementById('invoice-success-modal');
  if (modal) modal.style.display = 'none';
  document.onkeydown = null;
  window.location.href = 'invoices.html';
}

function goToDashboard() {
  const modal = document.getElementById('invoice-success-modal');
  if (modal) modal.style.display = 'none';
  document.onkeydown = null;
  window.location.href = 'dashboard.html';
}

window.addLineItem = addLineItem;
window.removeLineItem = removeLineItem;
window.updateLineItem = updateLineItem;
window.calculateTotals = calculateTotals;
window.saveInvoice = saveInvoice;
window.createQuickInvoice = createQuickInvoice;
window.duplicateLineItem = duplicateLineItem;
window.closeSuccessModal = closeSuccessModal;
window.goToDashboard = goToDashboard;
