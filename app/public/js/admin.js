const CORES_BY_SYSTEM = {
  snes: ['snes9x'],
  nes: ['nestopia', 'fceumm'],
  gba: ['mgba', 'vbam'],
  gb: ['gambatte', 'mgba'],
  gbc: ['gambatte', 'mgba'],
  genesis: ['genesis_plus_gx']
};

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

async function apiUpload(url, formData) {
  const resp = await fetch(url, {
    credentials: 'same-origin',
    method: 'POST',
    body: formData
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

async function initAdmin() {
  try {
    const me = await api('/api/me');
    if (!me.is_admin) {
      document.getElementById('no-admin').style.display = 'block';
      return;
    }
    document.getElementById('admin-content').style.display = 'block';
    await Promise.all([loadGames(), loadUsers()]);
  } catch {
    document.getElementById('not-logged').style.display = 'block';
  }
}

async function loadGames() {
  const games = await api('/api/admin/games');
  const grid = document.getElementById('games-grid');
  document.getElementById('games-count').textContent = games.length;

  if (!games.length) {
    grid.innerHTML = '<p>No hay juegos configurados.</p>';
    return;
  }

  grid.innerHTML = '';
  games.forEach((game) => {
    const card = document.createElement('div');
    card.className = 'game-card';
    const coverHtml = game.cover_path
      ? `<div class="cover-wrap"><img src="${game.cover_path}" alt="${game.name}" loading="lazy"></div>`
      : `<div class="cover-wrap"><div class="cover-placeholder">${game.name.charAt(0)}</div></div>`;
    card.innerHTML = `
      ${coverHtml}
      <div class="info">
        <h3>${game.name}</h3>
        <div class="meta">
          <span>${game.system.toUpperCase()}</span>
          <span>${game.core}</span>
          <span>${game.max_players} jugadores</span>
        </div>
        ${game.description ? `<p class="desc">${game.description}</p>` : ''}
        <p class="rom-path">ROM: ${game.rom_path}</p>
      </div>
      <div class="game-actions">
        <button onclick="deleteGame(${game.id}, '${game.name.replace(/'/g, "\\'")}')" class="error-btn">Eliminar</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function loadUsers() {
  const users = await api('/api/admin/users');
  const tbody = document.getElementById('users-body');
  document.getElementById('users-count').textContent = users.length;

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5">No hay usuarios.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  users.forEach((user) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.is_admin ? '<span class="badge-admin">Admin</span>' : '-'}</td>
      <td>${new Date(user.created_at).toLocaleDateString('es')}</td>
      <td>
        ${user.is_admin
          ? '<span class="text-dim">-</span>'
          : `<button onclick="deleteUser(${user.id}, '${user.username}')" class="small error-btn">Eliminar</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteGame(id, name) {
  if (!confirm(`Eliminar "${name}"? Se borrarán los archivos ROM y portada.`)) return;
  try {
    await api(`/api/admin/games/${id}`, { method: 'DELETE' });
    await loadGames();
  } catch (ex) {
    alert('Error: ' + ex.message);
  }
}

async function deleteUser(id, username) {
  if (!confirm(`Eliminar usuario "${username}"?`)) return;
  try {
    await api(`/api/admin/users/${id}`, { method: 'DELETE' });
    await loadUsers();
  } catch (ex) {
    alert('Error: ' + ex.message);
  }
}

async function logout() {
  await api('/api/logout', { method: 'POST' });
  location.href = '/';
}

// Core selector updates based on system
document.getElementById('game-system')?.addEventListener('change', (e) => {
  const coreSelect = document.getElementById('game-core');
  const cores = CORES_BY_SYSTEM[e.target.value] || [];
  coreSelect.innerHTML = cores.map(c => `<option value="${c}">${c}</option>`).join('');
});

// Cover preview
document.getElementById('game-cover')?.addEventListener('change', (e) => {
  const preview = document.getElementById('cover-preview');
  const file = e.target.files[0];
  if (!file) {
    preview.innerHTML = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.innerHTML = `<img src="${ev.target.result}" alt="Preview" class="cover-preview-img">`;
  };
  reader.readAsDataURL(file);
});

// Submit new game
document.getElementById('add-game-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('add-error');
  err.textContent = '';

  try {
    const formData = new FormData();
    formData.append('name', document.getElementById('game-name').value);
    formData.append('system', document.getElementById('game-system').value);
    formData.append('core', document.getElementById('game-core').value);
    formData.append('max_players', document.getElementById('game-max-players').value);
    formData.append('description', document.getElementById('game-description').value);

    const romFile = document.getElementById('game-rom').files[0];
    const coverFile = document.getElementById('game-cover').files[0];
    if (romFile) formData.append('rom', romFile);
    if (coverFile) formData.append('cover', coverFile);

    await apiUpload('/api/admin/games', formData);

    // Reset form
    document.getElementById('add-game-form').reset();
    document.getElementById('cover-preview').innerHTML = '';

    await loadGames();
  } catch (ex) {
    err.textContent = ex.message;
  }
});

initAdmin();
