let onboardingProgress = null;
let currentOnboardingUser = null;

const LS_ONBOARDING = 'ni_onboarding_meta_v2';

function readMeta() {
  try {
    return JSON.parse(localStorage.getItem(LS_ONBOARDING) || '{}');
  } catch {
    return {};
  }
}

function writeMeta(next) {
  localStorage.setItem(LS_ONBOARDING, JSON.stringify({ ...readMeta(), ...next }));
}

function isDashboardPage() {
  return document.body?.dataset?.appPage === 'dashboard';
}

async function initOnboarding(user) {
  currentOnboardingUser = user;

  try {
    const response = await fetch(`/api/onboarding?user_id=${encodeURIComponent(user.id)}`);
    const body = await response.json().catch(() => ({}));
    onboardingProgress = body.progress || null;
    if (!onboardingProgress) return;

    const meta = readMeta();
    const hasPaid = await detectFirstPaidInvoice();
    const firstShared = Boolean(meta.first_invoice_shared);

    document.getElementById('checklist-widget')?.remove();
    document.getElementById('welcome-modal')?.remove();

    if (hasPaid) {
      renderPostPaidInsights();
      return;
    }

    const complete = isCoreComplete();
    const brandNew = !onboardingProgress.profile_completed && !onboardingProgress.client_added && !onboardingProgress.invoice_created;

    if (!complete) {
      if (!onboardingProgress.wizard_dismissed && brandNew) {
        showWelcomeModal();
        return;
      }
      if (!onboardingProgress.checklist_closed) showChecklistWidget();
      return;
    }

    if (complete && !firstShared && isDashboardPage()) {
      showStep6Success();
      return;
    }

    if (!onboardingProgress.checklist_closed) showChecklistWidget();
  } catch (err) {
    console.error('Init onboarding error:', err);
  }
}

function isCoreComplete() {
  return Boolean(onboardingProgress?.profile_completed && onboardingProgress?.client_added && onboardingProgress?.invoice_created);
}

async function detectFirstPaidInvoice() {
  if (!currentOnboardingUser) return false;
  try {
    const res = await fetch(`/api/invoices?user_id=${encodeURIComponent(currentOnboardingUser.id)}`);
    const body = await res.json().catch(() => ({}));
    const rows = Array.isArray(body.invoices) ? body.invoices : [];
    return rows.some((x) => x.status === 'paid');
  } catch {
    return false;
  }
}

function showWelcomeModal() {
  if (document.getElementById('welcome-modal')) return;
  const modal = document.createElement('div');
  modal.className = 'onboarding-modal';
  modal.id = 'welcome-modal';
  modal.innerHTML = `
    <div class="onboarding-overlay"></div>
    <div class="onboarding-content welcome-screen">
      <div class="welcome-header">
        <div class="welcome-icon">💸</div>
        <h1>Let's get you paid faster.</h1>
        <p>This takes less than 3 minutes.</p>
      </div>
      <div class="step-progress" style="margin-bottom:18px;">
        <div class="step-progress-bar"><div class="step-progress-fill" style="width: 10%"></div></div>
        <span class="step-counter">Estimated setup time: 3 minutes</span>
      </div>
      <div class="welcome-actions">
        <button type="button" onclick="startOnboarding()" class="btn btn-primary btn-lg">Start setup</button>
        <button type="button" onclick="skipOnboarding()" class="btn btn-ghost">Skip for now</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 100);
}

function startOnboarding() {
  document.getElementById('welcome-modal')?.remove();
  showStepModal(1);
}

async function skipOnboarding() {
  await updateProgress({ wizard_dismissed: true });
  document.getElementById('welcome-modal')?.remove();
  showChecklistWidget();
}

const STEP_COPY = {
  1: {
    icon: '👋',
    title: 'Welcome',
    subtitle: 'We will guide you end-to-end. No accounting complexity.',
    bullets: ['You only need a few details', 'You can edit everything later', 'Goal: share your first invoice']
  },
  2: {
    icon: '🏢',
    title: 'What should clients see on your invoice?',
    subtitle: 'Set up business identity in simple language.',
    bullets: ['Business name and contact details', 'Friendly helper text on each field', 'Keep it simple and professional']
  },
  3: {
    icon: '🏦',
    title: 'How should clients pay you?',
    subtitle: 'Add payment details and invoice numbering.',
    bullets: ['Bank details for transfer', 'Invoice numbering example: INV-001', 'Clear payment instructions for clients']
  },
  4: {
    icon: '📇',
    title: 'Who do you usually work with?',
    subtitle: 'Add your first client now.',
    bullets: ['Client name is enough to start', 'Email and phone are optional', 'You can add more clients later']
  },
  5: {
    icon: '🧾',
    title: 'Create your first invoice',
    subtitle: 'Use Quick Invoice mode to move faster.',
    bullets: ['Most freelancers use 7-day terms', 'Only client, amount, description required', 'Share right after creation']
  },
  6: {
    icon: '✅',
    title: 'Your invoice is ready to share',
    subtitle: 'This is your activation moment.',
    bullets: ['Share on WhatsApp', 'Copy invoice link', 'Download PDF']
  }
};

function showStepModal(stepNum) {
  document.getElementById('step-modal')?.remove();
  const data = STEP_COPY[stepNum];
  if (!data) return;
  const modal = document.createElement('div');
  modal.className = 'onboarding-modal';
  modal.id = 'step-modal';
  const pct = Math.round((stepNum / 6) * 100);
  const bullets = data.bullets.map((b) => `<div class="checklist-item"><span class="check-icon">✓</span><span>${b}</span></div>`).join('');
  modal.innerHTML = `
    <div class="onboarding-overlay"></div>
    <div class="onboarding-content step-screen">
      <div class="step-header">
        <div class="step-progress">
          <div class="step-progress-bar"><div class="step-progress-fill" style="width:${pct}%"></div></div>
          <span class="step-counter">Step ${stepNum} of 6</span>
        </div>
      </div>
      <div class="step-body">
        <div class="step-icon">${data.icon}</div>
        <h2>${data.title}</h2>
        <p>${data.subtitle}</p>
        <div class="step-checklist">${bullets}</div>
      </div>
      <div class="step-actions">
        <button type="button" onclick="closeStepModal()" class="btn btn-ghost">Close</button>
        <button type="button" onclick="stepPrimaryAction(${stepNum})" class="btn btn-primary">Continue</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 100);
}

window.stepPrimaryAction = function stepPrimaryAction(stepNum) {
  closeStepModal();
  if (stepNum === 1) return showStepModal(2);
  if (stepNum === 2) return goToProfile();
  if (stepNum === 3) return goToProfile();
  if (stepNum === 4) return goToClients();
  if (stepNum === 5) return goToCreateInvoice();
  if (stepNum === 6) return (window.location.href = 'invoices.html');
};

function showChecklistWidget() {
  if (!onboardingProgress) return;
  document.getElementById('checklist-widget')?.remove();
  if (onboardingProgress.checklist_closed) return;

  const meta = readMeta();
  const items = [
    { id: 'profile', title: 'Business setup', done: onboardingProgress.profile_completed },
    { id: 'client', title: 'First client added', done: onboardingProgress.client_added },
    { id: 'invoice', title: 'First invoice created', done: onboardingProgress.invoice_created },
    { id: 'share', title: 'First invoice shared', done: Boolean(meta.first_invoice_shared) }
  ];
  const completed = items.filter((i) => i.done).length;
  const percentage = (completed / items.length) * 100;

  const widget = document.createElement('div');
  widget.className = 'onboarding-checklist-widget';
  widget.id = 'checklist-widget';
  widget.innerHTML = `
    <div class="checklist-header">
      <h3>Getting Started Assistant</h3>
      <button type="button" onclick="dismissChecklist()" class="checklist-close" aria-label="Close checklist">✕</button>
    </div>
    <div class="checklist-progress">
      <div class="checklist-progress-bar"><div class="checklist-progress-fill" style="width:${percentage}%"></div></div>
      <span>${completed} of ${items.length} completed</span>
    </div>
    <div class="checklist-items">
      ${items.map((it) => `
        <div class="checklist-item js-checklist-step ${it.done ? 'completed' : ''}" data-step="${it.id}">
          <span class="checklist-checkbox">${it.done ? '✓' : ''}</span>
          <span>${it.title}</span>
        </div>`).join('')}
    </div>
  `;

  const container = document.querySelector('.main-content');
  if (!container) return;
  container.insertBefore(widget, container.firstChild);
  widget.querySelectorAll('.checklist-item.js-checklist-step').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.classList.contains('completed')) return;
      const step = el.dataset.step;
      if (step === 'profile') goToProfile();
      else if (step === 'client') goToClients();
      else if (step === 'invoice') goToCreateInvoice();
      else showStep6Success();
    });
  });
}

function showStep6Success() {
  showStepModal(6);
}

function closeStepModal() {
  const modal = document.getElementById('step-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 220);
  }
}

async function dismissChecklist() {
  await updateProgress({ checklist_closed: true });
  const widget = document.getElementById('checklist-widget');
  if (widget) widget.remove();
}

function goToProfile() { window.location.href = 'profile.html?onboarding=true'; }
function goToClients() { window.location.href = 'clients.html?onboarding=true'; }
function goToCreateInvoice() { window.location.href = 'create-invoice.html?onboarding=true'; }

async function updateProgress(updates) {
  try {
    if (!currentOnboardingUser) return;
    const res = await fetch('/api/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentOnboardingUser.id, ...updates })
    });
    await res.json().catch(() => ({}));
    if (onboardingProgress) Object.assign(onboardingProgress, updates);
  } catch (err) {
    console.error('Update progress error:', err);
  }
}

async function checkStepCompletion(step) {
  const updates = {};
  if (step === 'profile') updates.profile_completed = true;
  if (step === 'client') updates.client_added = true;
  if (step === 'invoice') updates.invoice_created = true;
  await updateProgress(updates);

  if (isCoreComplete()) {
    showStep6Success();
  }

  document.getElementById('checklist-widget')?.remove();
  if (!onboardingProgress?.checklist_closed) showChecklistWidget();
}

function markInvoiceShared() {
  writeMeta({ first_invoice_shared: true, first_invoice_shared_at: new Date().toISOString() });
  if (typeof showToast === 'function') {
    showToast('Nice work. First invoice shared!', 'success');
  }
  document.getElementById('step-modal')?.remove();
  document.getElementById('checklist-widget')?.remove();
  if (!onboardingProgress?.checklist_closed) showChecklistWidget();
}

async function renderPostPaidInsights() {
  if (!isDashboardPage()) return;
  const container = document.querySelector('.main-content');
  if (!container) return;
  document.getElementById('checklist-widget')?.remove();
  if (document.getElementById('post-paid-insights')) return;
  const card = document.createElement('div');
  card.id = 'post-paid-insights';
  card.className = 'onboarding-checklist-widget';
  card.innerHTML = `
    <div class="checklist-header"><h3>Operational Insights</h3></div>
    <div class="checklist-items">
      <div class="checklist-item completed"><span class="checklist-checkbox">✓</span><span>First paid invoice received</span></div>
      <div class="checklist-item"><span class="checklist-checkbox"></span><span>Focus on overdue and viewed invoices in Action Required</span></div>
      <div class="checklist-item"><span class="checklist-checkbox"></span><span>Send reminders daily to get paid faster</span></div>
    </div>
  `;
  container.insertBefore(card, container.firstChild);
}

window.initOnboarding = initOnboarding;
window.checkStepCompletion = checkStepCompletion;
window.startOnboarding = startOnboarding;
window.skipOnboarding = skipOnboarding;
window.closeStepModal = closeStepModal;
window.dismissChecklist = dismissChecklist;
window.goToProfile = goToProfile;
window.goToClients = goToClients;
window.goToCreateInvoice = goToCreateInvoice;
window.markInvoiceShared = markInvoiceShared;
