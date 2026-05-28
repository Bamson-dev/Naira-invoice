let currentUser = null;
let clients = [];
let invoices = [];
let savingClient = false;
let savingClient = false;

(async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });

  if (typeof syncOnboarding === 'function') syncOnboarding(currentUser);

  await Promise.all([loadClients(), loadInvoices()]);
  displayClients();
})();

async function loadClients() {
  const res = await fetch(`/api/clients?user_id=${currentUser.id}`);
  const body = await res.json().catch(() => ({}));
  clients = Array.isArray(body.clients) ? body.clients : [];
}

async function loadInvoices() {
  const res = await fetch(`/api/invoices?user_id=${currentUser.id}`);
  const body = await res.json().catch(() => ({}));
  invoices = Array.isArray(body.invoices) ? body.invoices : [];
}

function clientStats(clientId) {
  const list = invoices.filter((i) => i.client_id === clientId);
  const paid = list.filter((i) => i.status === 'paid').length;
  const revenue = list.reduce((s,i)=>s+Number(i.total_amount||0),0);
  const unpaid = list.filter((i)=>i.status!=='paid').reduce((s,i)=>s+Number(i.total_amount||0),0);
  const recent = list.sort((a,b)=>new Date(b.invoice_date)-new Date(a.invoice_date))[0];
  const reliability = list.length ? Math.round((paid / list.length) * 100) : 0;
  return { revenue, unpaid, recent, reliability };
}

function displayClients() {
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (v) => String(v ?? '');
  const tbody = document.getElementById('clients-list');
  const mobile = document.getElementById('clients-mobile-list');
  if (!clients.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No clients yet. Add your first client.</td></tr>';
    if (mobile) mobile.innerHTML = '<div class="empty-cell">No clients yet. Add your first client.</div>';
    return;
  }

  tbody.innerHTML = clients.map((c) => {
    const st = clientStats(c.id);
    return `
      <tr>
        <td><strong>${esc(c.client_name)}</strong><br><small>${esc(c.client_email || '')}</small></td>
        <td>₦${st.revenue.toLocaleString()}</td>
        <td>₦${st.unpaid.toLocaleString()}</td>
        <td>${st.recent ? `${esc(st.recent.invoice_number)} · ${new Date(st.recent.invoice_date).toLocaleDateString()}` : 'N/A'}</td>
        <td><span class="status-badge ${st.reliability >= 80 ? 'status-paid' : st.reliability >= 50 ? 'status-sent' : 'status-overdue'}">${st.reliability}%</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="createInvoiceForClient('${c.id}')">Invoice</button>
            <button class="btn btn-text btn-danger" onclick="deleteClient('${c.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (mobile) {
    mobile.innerHTML = clients.map((c) => {
      const st = clientStats(c.id);
      return `
      <article class="mobile-invoice-card">
        <div class="mobile-invoice-head">
          <strong>${esc(c.client_name)}</strong>
          <span class="status-badge ${st.reliability >= 80 ? 'status-paid' : st.reliability >= 50 ? 'status-sent' : 'status-overdue'}">${st.reliability}%</span>
        </div>
        <p class="page-subtitle">Unpaid: ₦${st.unpaid.toLocaleString()} · Revenue: ₦${st.revenue.toLocaleString()}</p>
        <div class="mobile-invoice-actions">
          <button class="btn btn-ghost btn-sm" onclick="createInvoiceForClient('${c.id}')">Invoice</button>
          <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')">Edit</button>
          <button class="btn btn-text btn-danger" onclick="deleteClient('${c.id}')">Delete</button>
        </div>
      </article>`;
    }).join('');
  }
}

function createInvoiceForClient(id) {
  window.location.href = `create-invoice.html?client=${encodeURIComponent(id)}`;
}

function showAddClientModal() {
  document.getElementById('modal-title').textContent = 'Add Client';
  document.getElementById('client-id').value = '';
  document.getElementById('client-name').value = '';
  document.getElementById('client-email').value = '';
  document.getElementById('client-phone').value = '';
  document.getElementById('client-address').value = '';
  document.getElementById('client-notes').value = '';
  document.getElementById('client-modal').style.display = 'flex';
}

function editClient(id) {
  const client = clients.find((x) => x.id === id);
  if (!client) return;
  document.getElementById('modal-title').textContent = 'Edit Client';
  document.getElementById('client-id').value = client.id;
  document.getElementById('client-name').value = client.client_name || '';
  document.getElementById('client-email').value = client.client_email || '';
  document.getElementById('client-phone').value = client.client_phone || '';
  document.getElementById('client-address').value = client.client_address || '';
  document.getElementById('client-notes').value = client.notes || '';
  document.getElementById('client-modal').style.display = 'flex';
}

function closeClientModal() {
  document.getElementById('client-modal').style.display = 'none';
}

async function saveClient() {
  if (savingClient) return;
  savingClient = true;
  const id = document.getElementById('client-id').value;
  const payload = {
    user_id: currentUser.id,
    client_name: document.getElementById('client-name').value,
    client_email: document.getElementById('client-email').value,
    client_phone: document.getElementById('client-phone').value,
    client_address: document.getElementById('client-address').value,
    notes: document.getElementById('client-notes').value
  };

  if (!payload.client_name) {
    showToast('Client name is required', 'error');
    savingClient = false;
    return;
  }

  const url = id ? `/api/clients/${id}` : '/api/clients';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    showToast(body.error || 'Could not save client', 'error');
    savingClient = false;
    return;
  }

  closeClientModal();
  await Promise.all([loadClients(), loadInvoices()]);
  displayClients();
  showToast('Client saved', 'success');

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('onboarding') === 'true' && typeof checkStepCompletion === 'function') {
    await checkStepCompletion('client');
  }
  savingClient = false;
}

async function deleteClient(id) {
  if (!confirm('Delete this client?')) return;
  const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    showToast('Failed to delete client', 'error');
    return;
  }
  await Promise.all([loadClients(), loadInvoices()]);
  displayClients();
}

window.showAddClientModal = showAddClientModal;
window.editClient = editClient;
window.closeClientModal = closeClientModal;
window.saveClient = saveClient;
window.deleteClient = deleteClient;
window.createInvoiceForClient = createInvoiceForClient;
