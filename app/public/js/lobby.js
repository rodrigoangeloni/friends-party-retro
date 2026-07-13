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
    card.innerHTML = `
      <h3>${game.name}</h3>
      <p>Sistema: ${game.system} | Core: ${game.core}</p>
      <p>Max jugadores: ${game.max_players}</p>
      ${game.description ? `<p class="desc">${game.description}</p>` : ''}
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
        <strong>${r.room_name}</strong>
        <span>Host: ${r.player_name}</span>
        <span>Jugadores: ${r.current}/${r.max}</span>
        ${r.hasPassword ? '<span class="badge">Con contrasena</span>' : ''}
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