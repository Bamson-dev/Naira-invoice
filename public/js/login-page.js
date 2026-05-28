checkAuth().catch(() => {});

const form = document.getElementById('login-form');
const btn = document.getElementById('login-btn');
const msg = document.getElementById('message');

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = 'auth-alert ' + type;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showMsg('Please fill in all fields.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  msg.textContent = '';
  msg.className = 'auth-alert';

  try {
    const { error } = await handleLogin(email, password);
    if (error) {
      showMsg(error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Sign in';
      return;
    }
    showMsg('Success! Opening your dashboard…', 'success');
    window.location.replace('dashboard.html');
  } catch (err) {
    showMsg(err.message || 'Could not connect. Check that the API and database are running.', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});
