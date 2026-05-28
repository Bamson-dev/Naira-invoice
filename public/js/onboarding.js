/**
 * Onboarding — optional, non-blocking. UI only on dashboard unless user opts in.
 */
let onboardingProgress = null;
let currentOnboardingUser = null;

const LS_ONBOARDING = 'ni_onboarding_meta_v3';

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

function isAssistantHidden() {
  const meta = readMeta();
  if (meta.assistant_hidden) return true;
  if (onboardingProgress?.checklist_closed) return true;
  return false;
}

function isCoreComplete() {
  return Boolean(
    onboardingProgress?.profile_completed &&
      onboardingProgress?.client_added &&
      onboardingProgress?.invoice_created
  );
}

async function loadOnboarding(user) {
  currentOnboardingUser = user;
  try {
    const response = await window.apiClient.apiFetch(
      `/api/onboarding?user_id=${encodeURIComponent(user.id)}`
    );
    const body = await response.json().catch(() => ({}));
    onboardingProgress = body.progress || null;
    if (onboardingProgress?.checklist_closed) {
      writeMeta({ assistant_hidden: true });
    }
  } catch (err) {
    console.error('Load onboarding error:', err);
    onboardingProgress = null;
  }
}

/** Sync progress only — no UI (profile, clients, create invoice). */
async function syncOnboarding(user) {
  await loadOnboarding(user);
}

/**
 * Dashboard-only optional assistant.
 * @param {object} user
 * @param {{ showUi?: boolean }} options
 */
async function initOnboarding(user, options = {}) {
  const showUi = options.showUi === true;
  await loadOnboarding(user);
  if (!showUi || !onboardingProgress) return;
  renderOnboardingUI();
}

function renderOnboardingUI() {
  document.getElementById('checklist-widget')?.remove();
  document.getElementById('welcome-modal')?.remove();
  document.getElementById('step-modal')?.remove();
  document.getElementById('post-paid-insights')?.remove();

  if (isAssistantHidden()) return;

  const meta = readMeta();
  const brandNew =
    !onboardingProgress.profile_completed &&
    !onboardingProgress.client_added &&
    !onboardingProgress.invoice_created;

  if (brandNew && !meta.welcome_seen && !onboardingProgress.wizard_dismissed) {
    showWelcomeModal();
    return;
  }

  showChecklistWidget();
}

function showWelcomeModal() {
  if (document.getElementById('welcome-modal')) return;
  writeMeta({ welcome_seen: true });

  const modal = document.createElement('div');
  modal.className = 'onboarding-modal';
  modal.id = 'welcome-modal';
  modal.innerHTML = `
    <div class="onboarding-overlay"></div>
    <div class="onboarding-content welcome-screen">
      <div class="welcome-header">
        <div class="welcome-icon">💸</div>
        <h1>Let's get you paid faster.</h1>
        <p>Optional 3-minute setup — you can invoice anytime without it.</p>
      </div>
      <div class="step-progress" style="margin-bottom:18px;">
        <div class="step-progress-bar"><div class="step-progress-fill" style="width: 10%"></div></div>
        <span class="step-counter">Estimated setup time: 3 minutes</span>
      </div>
      <div class="welcome-actions">
        <button type="button" id="onboarding-start-btn" class="btn btn-primary btn-lg">Start setup</button>
        <button type="button" id="onboarding-skip-btn" class="btn btn-ghost">Not now — hide assistant</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#onboarding-start-btn')?.addEventListener('click', startOnboarding);
  modal.querySelector('#onboarding-skip-btn')?.addEventListener('click', skipOnboarding);
  setTimeout(() => modal.classList.add('show'), 100);
}

function startOnboarding() {
  document.getElementById('welcome-modal')?.remove();
  showStepModal(1);
}

async function skipOnboarding() {
  await hideAssistantPermanent();
}

async function hideAssistantPermanent() {
  writeMeta({ assistant_hidden: true, hidden_at: new Date().toISOString() });
  await updateProgress({ wizard_dismissed: true, checklist_closed: true });
  document.getElementById('welcome-modal')?.remove();
  document.getElementById('step-modal')?.remove();
  document.getElementById('checklist-widget')?.remove();
  document.getElementById('post-paid-insights')?.remove();
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
  const bullets = data.bullets
    .map((b) => `<div class="checklist-item"><span class="check-icon">✓</span><span>${b}</span></div>`)
    .join('');
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
        <button type="button" class="btn btn-ghost js-step-close">Close</button>
        <button type="button" class="btn btn-primary js-step-continue">Continue</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.js-step-close')?.addEventListener('click', closeStepModal);
  modal.querySelector('.js-step-continue')?.addEventListener('click', () => stepPrimaryAction(stepNum));
  setTimeout(() => modal.classList.add('show'), 100);
}

function stepPrimaryAction(stepNum) {
  closeStepModal();
  if (stepNum === 1) return showStepModal(2);
  if (stepNum === 2) return goToProfile();
  if (stepNum === 3) return goToProfile();
  if (stepNum === 4) return goToClients();
  if (stepNum === 5) return goToCreateInvoice();
  if (stepNum === 6) return (window.location.href = 'invoices.html');
}

function showChecklistWidget() {
  if (!onboardingProgress || isAssistantHidden()) return;
  if (!isDashboardPage()) return;

  document.getElementById('checklist-widget')?.remove();

  const meta = readMeta();
  const collapsed = Boolean(meta.checklist_collapsed);
  const items = [
    { id: 'profile', title: 'Business setup', done: onboardingProgress.profile_completed },
    { id: 'client', title: 'First client added', done: onboardingProgress.client_added },
    { id: 'invoice', title: 'First invoice created', done: onboardingProgress.invoice_created },
    { id: 'share', title: 'First invoice shared', done: Boolean(meta.first_invoice_shared) }
  ];
  const completed = items.filter((i) => i.done).length;
  const percentage = (completed / items.length) * 100;

  const widget = document.createElement('div');
  widget.className = 'onboarding-checklist-widget' + (collapsed ? ' is-collapsed' : '');
  widget.id = 'checklist-widget';
  widget.innerHTML = `
    <div class="checklist-header">
      <div>
        <h3>Getting started</h3>
        <p class="checklist-subtitle">Optional — ${completed} of ${items.length} done</p>
      </div>
      <div class="checklist-header-actions">
        <button type="button" class="btn btn-ghost btn-sm js-toggle-checklist" aria-label="Collapse">${collapsed ? 'Show' : 'Hide'}</button>
        <button type="button" class="checklist-close js-dismiss-checklist" aria-label="Dismiss forever">✕</button>
      </div>
    </div>
    <div class="checklist-body">
      <div class="checklist-progress">
        <div class="checklist-progress-bar"><div class="checklist-progress-fill" style="width:${percentage}%"></div></div>
      </div>
      <div class="checklist-items">
        ${items
          .map(
            (it) => `
        <div class="checklist-item js-checklist-step ${it.done ? 'completed' : ''}" data-step="${it.id}">
          <span class="checklist-checkbox">${it.done ? '✓' : ''}</span>
          <span>${it.title}</span>
        </div>`
          )
          .join('')}
      </div>
      <button type="button" class="btn btn-text btn-sm js-dismiss-checklist-footer">Don't show this again</button>
    </div>
  `;

  const container = document.querySelector('.main-content');
  if (!container) return;
  container.insertBefore(widget, container.firstChild);

  widget.querySelector('.js-toggle-checklist')?.addEventListener('click', () => {
    writeMeta({ checklist_collapsed: !collapsed });
    showChecklistWidget();
  });
  widget.querySelectorAll('.js-dismiss-checklist, .js-dismiss-checklist-footer').forEach((btn) => {
    btn.addEventListener('click', dismissChecklist);
  });
  widget.querySelectorAll('.checklist-item.js-checklist-step').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.classList.contains('completed')) return;
      const step = el.dataset.step;
      if (step === 'profile') goToProfile();
      else if (step === 'client') goToClients();
      else if (step === 'invoice') goToCreateInvoice();
      else if (step === 'share') window.location.href = 'invoices.html';
    });
  });
}

function closeStepModal() {
  const modal = document.getElementById('step-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 220);
  }
}

async function dismissChecklist() {
  await hideAssistantPermanent();
  if (typeof showToast === 'function') {
    showToast('Getting started guide hidden. You can use the app freely.', 'success');
  }
}

function goToProfile() {
  window.location.href = 'profile.html?onboarding=true';
}
function goToClients() {
  window.location.href = 'clients.html?onboarding=true';
}
function goToCreateInvoice() {
  window.location.href = 'create-invoice.html?onboarding=true';
}

async function updateProgress(updates) {
  if (!currentOnboardingUser) return;
  try {
    const res = await window.apiClient.apiFetch('/api/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentOnboardingUser.id, ...updates })
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.progress) {
      onboardingProgress = body.progress;
    } else if (onboardingProgress) {
      Object.assign(onboardingProgress, updates);
    }
  } catch (err) {
    console.error('Update progress error:', err);
    if (onboardingProgress) Object.assign(onboardingProgress, updates);
  }
}

async function checkStepCompletion(step) {
  await loadOnboarding(currentOnboardingUser);
  const updates = {};
  if (step === 'profile') updates.profile_completed = true;
  if (step === 'client') updates.client_added = true;
  if (step === 'invoice') updates.invoice_created = true;
  await updateProgress(updates);

  if (isAssistantHidden() || !isDashboardPage()) return;

  if (isCoreComplete() && !readMeta().share_nudge_shown) {
    writeMeta({ share_nudge_shown: true });
    if (typeof showToast === 'function') {
      showToast('Nice! Share your first invoice from the Invoices page when you are ready.', 'success');
    }
    return;
  }

  showChecklistWidget();
}

function markInvoiceShared() {
  writeMeta({ first_invoice_shared: true, first_invoice_shared_at: new Date().toISOString() });
  if (typeof showToast === 'function') {
    showToast('First invoice shared — great work!', 'success');
  }
  document.getElementById('step-modal')?.remove();
  if (!isAssistantHidden() && isDashboardPage()) showChecklistWidget();
}

window.initOnboarding = initOnboarding;
window.syncOnboarding = syncOnboarding;
window.checkStepCompletion = checkStepCompletion;
window.startOnboarding = startOnboarding;
window.skipOnboarding = skipOnboarding;
window.closeStepModal = closeStepModal;
window.dismissChecklist = dismissChecklist;
window.hideAssistantPermanent = hideAssistantPermanent;
window.goToProfile = goToProfile;
window.goToClients = goToClients;
window.goToCreateInvoice = goToCreateInvoice;
window.markInvoiceShared = markInvoiceShared;
