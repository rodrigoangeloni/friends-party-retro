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

async function initLobby() {
  try {
    const me = await api('/api/me');
    document.getElementById('me-username').textContent = me.username;
    if (me.is_admin) {
      const adminLink = document.getElementById('admin-link');
      if (adminLink) adminLink.style.display = 'inline';
    }
  } catch {
    location.href = '/';
    return;
  }
  await loadGames();
}

async function loadGames() {
  const games = await api('/api/games');
  const grid = document.getElementById('games-list');
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
      </div>
      <button onclick="location.href='/play/${game.id}'">Jugar</button>
    `;
    grid.appendChild(card);
  });
}