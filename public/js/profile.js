let currentUser = null;
let currentProfile = null;

function showProfileStatus(text, type = 'success') {
  const el = document.getElementById('profile-status');
  if (!el) {
    console.log('[Profile]', type, text);
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



function initProfileTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });
}

(async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });

  if (typeof initOnboarding === 'function') {
    initOnboarding(currentUser);
  }

  initProfileTabs();
  loadProfile();

  document.getElementById('logo-upload').addEventListener('change', handleLogoUpload);
})();

async function loadProfile() {
  try {
    const response = await fetch(`/api/profile?user_id=${currentUser.id}`);
    const { profile } = await response.json();

    if (profile) {
      currentProfile = profile;
      document.getElementById('business-name').value = profile.business_name || '';
      document.getElementById('business-address').value = profile.business_address || '';
      document.getElementById('phone').value = profile.phone || '';
      document.getElementById('email').value = profile.email || '';
      document.getElementById('bank-name').value = profile.bank_name || '';
      document.getElementById('account-number').value = profile.account_number || '';
      document.getElementById('account-name').value = profile.account_name || '';
      document.getElementById('tax-id').value = profile.tax_id || '';
      document.getElementById('invoice-prefix').value = profile.invoice_prefix || 'INV';
      document.getElementById('brand-accent-color').value = profile.brand_accent_color || '#6D28D9';
      document.getElementById('invoice-footer-text').value = profile.invoice_footer_text || 'Generated with PDigitalHQ';
      document.getElementById('invoice-signature').value = profile.invoice_signature || '';
      document.getElementById('invoice-watermark-text').value = profile.invoice_watermark_text || '';

      if (profile.logo_url) {
        document.getElementById('logo-preview').innerHTML = `
          <img src="${profile.logo_url}" alt="Logo" style="max-width: 200px; margin-top: 10px;">
        `;
      }
    }
  } catch (error) {
    console.error('Load profile error:', error);
  }
}

async function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('logo', file);
  formData.append('user_id', currentUser.id);

  try {
    const response = await fetch('/api/profile/upload-logo', {
      method: 'POST',
      body: formData
    });

    const { logo_url } = await response.json();

    document.getElementById('logo-preview').innerHTML = `
      <img src="${logo_url}" alt="Logo" style="max-width: 200px; margin-top: 10px;">
    `;

    if (currentProfile) {
      currentProfile.logo_url = logo_url;
    }
  } catch (error) {
    console.error('Upload logo error:', error);
    showProfileStatus('Failed to upload logo.', 'error');
    if (typeof showToast === 'function') showToast('Failed to upload logo', 'error');
  }
}

async function saveProfile() {
  const profileData = {
    user_id: currentUser.id,
    business_name: document.getElementById('business-name').value,
    business_address: document.getElementById('business-address').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    bank_name: document.getElementById('bank-name').value,
    account_number: document.getElementById('account-number').value,
    account_name: document.getElementById('account-name').value,
    tax_id: document.getElementById('tax-id').value,
    invoice_prefix: document.getElementById('invoice-prefix').value || 'INV',
    brand_accent_color: document.getElementById('brand-accent-color').value || '#6D28D9',
    invoice_footer_text: document.getElementById('invoice-footer-text').value || 'Generated with PDigitalHQ',
    invoice_signature: document.getElementById('invoice-signature').value,
    invoice_watermark_text: document.getElementById('invoice-watermark-text').value
  };

  if (currentProfile && currentProfile.logo_url) {
    profileData.logo_url = currentProfile.logo_url;
  }

  if (!profileData.business_name) {
    showProfileStatus('Business name is required.', 'error');
    if (typeof showToast === 'function') showToast('Business name is required', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-profile-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
  }

  try {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      showProfileStatus(
        body.error || `Could not save profile (${response.status}). Check the terminal running npm start.`,
        'error'
      );
      if (typeof showToast === 'function') showToast(body.error || 'Failed to save profile', 'error');
      console.error('Save profile API error:', body);
      return;
    }

    showProfileStatus('Profile saved successfully. You can create invoices now.', 'success');
    if (typeof showToast === 'function') showToast('Profile saved successfully!', 'success');
    await loadProfile();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') === 'true' && typeof checkStepCompletion === 'function') {
      await checkStepCompletion('profile');
    }
  } catch (error) {
    console.error('Save profile error:', error);
    showProfileStatus('Failed to save profile (network error).', 'error');
    if (typeof showToast === 'function') showToast('Failed to save profile', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Profile';
    }
  }
}

window.saveProfile = saveProfile;
