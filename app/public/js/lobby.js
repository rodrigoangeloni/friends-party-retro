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

let selectedGameId = null;
let selectedGameName = null;
let selectedGameMax = 2;

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
    card.id = `game-card-${game.id}`;
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
      <button onclick="selectGame(${game.id}, '${game.name.replace(/'/g, "\\'")}', ${game.max_players})">Seleccionar</button>
    `;
    grid.appendChild(card);
  });
}

async function selectGame(gameId, gameName, maxPlayers) {
  selectedGameId = gameId;
  selectedGameName = gameName;
  selectedGameMax = maxPlayers;
  document.getElementById('selected-game-name').textContent = gameName;
  document.getElementById('rooms-section').style.display = 'block';
  document.getElementById('max-players').max = maxPlayers;
  document.getElementById('max-players').value = Math.min(2, maxPlayers);

  document.querySelectorAll('.game-card').forEach(c => c.classList.remove('selected'));
  const selected = document.getElementById(`game-card-${gameId}`);
  if (selected) selected.classList.add('selected');

  await refreshRooms();
}

async function refreshRooms() {
  if (!selectedGameId) return;
  const list = document.getElementById('rooms-list');
  try {
    const rooms = await api(`/api/rooms?game_id=${selectedGameId}`);
    const keys = Object.keys(rooms);
    if (!keys.length) {
      list.innerHTML = '<p>No hay salas abiertas. Crea una!</p>';
      return;
    }
    list.innerHTML = '';
    keys.forEach((roomId) => {
      const r = rooms[roomId];
      const div = document.createElement('div');
      div.className = 'room-item';
      div.innerHTML = `
        <div class="room-header">
          <strong>${r.room_name}</strong>
          ${r.hasPassword ? '<span class="badge">Privada</span>' : '<span class="badge" style="background:rgba(57,255,20,0.12);color:var(--success);border-color:rgba(57,255,20,0.25);">Publica</span>'}
        </div>
        <div class="room-meta">
          <span>Host: ${r.player_name}</span>
          <span>Jugadores: ${r.current}/${r.max}</span>
        </div>
        <button onclick="joinRoom('${roomId}', ${r.hasPassword})">Unirse</button>
      `;
      list.appendChild(div);
    });
  } catch (ex) {
    list.innerHTML = `<p class="error">Error: ${ex.message}</p>`;
  }
}

async function joinRoom(roomId, hasPassword) {
  let password = null;
  if (hasPassword) {
    password = prompt('Contrasena de la sala:');
    if (password === null) return;
  }
  try {
    sessionStorage.setItem('joinPassword', password || '');
    location.href = `/play/${roomId}`;
  } catch (ex) {
    alert(ex.message);
  }
}

document.getElementById('create-room-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('create-error');
  err.textContent = '';
  try {
    const roomName = document.getElementById('room-name').value.trim();
    const maxPlayers = parseInt(document.getElementById('max-players').value, 10);
    const password = document.getElementById('room-password').value || null;
    if (!roomName) throw new Error('Nombre de sala requerido');
    const data = await api('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({
        game_id: selectedGameId,
        room_name: roomName,
        max_players: maxPlayers,
        password
      })
    });
    sessionStorage.setItem('joinPassword', password || '');
    location.href = `/play/${data.room_id}`;
  } catch (ex) {
    err.textContent = ex.message;
  }
});