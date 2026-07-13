async function api(url, opts = {}) {
  const resp = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

async function checkAuth() {
  try {
    const me = await api('/api/me');
    showLoggedIn(me);
  } catch {
    showLoginForm();
  }
}

function showLoggedIn(user) {
  document.getElementById('auth-section').style.display = 'none';
  const li = document.getElementById('logged-in');
  li.style.display = 'block';
  const el = document.getElementById('me-username');
  if (el) el.textContent = user.username;
}

function showLoginForm() {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('logged-in').style.display = 'none';
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  document.getElementById('panel-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('panel-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('login-error').textContent = '';
  document.getElementById('reg-error').textContent = '';
}

async function login(username, password) {
  const data = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  showLoggedIn(data);
  return data;
}

async function register(username, password) {
  const data = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  showLoggedIn(data);
  return data;
}

async function logout() {
  await api('/api/logout', { method: 'POST' });
  location.href = '/';
}

document.querySelectorAll('.auth-tab').forEach((btn) => {
  btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
});

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('login-error');
  err.textContent = '';
  try {
    await login(
      document.getElementById('login-username').value,
      document.getElementById('login-password').value
    );
    location.href = '/lobby.html';
  } catch (ex) {
    err.textContent = ex.message;
  }
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('reg-error');
  err.textContent = '';
  try {
    await register(
      document.getElementById('reg-username').value,
      document.getElementById('reg-password').value
    );
    location.href = '/lobby.html';
  } catch (ex) {
    err.textContent = ex.message;
  }
});