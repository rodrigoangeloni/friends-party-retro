const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const { db, queries } = require('./db');
const {
  hashPassword,
  verifyPassword,
  createToken,
  authRequired,
  adminRequired,
  authOptional,
  setAuthCookie,
  clearAuthCookie,
  validateUsername,
  validatePassword
} = require('./auth');
const { uploadGameFiles, deleteFile } = require('./upload');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;
const NETPLAY_SERVER_URL = process.env.NETPLAY_SERVER_URL || 'http://localhost:3000';

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function generateRoomId() {
  return crypto.randomBytes(8).toString('hex');
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!validateUsername(username) || !validatePassword(password)) {
    return res.status(400).json({ error: 'Usuario (3-20 chars alfanumericos) y contrasena (4-100 chars) requeridos' });
  }
  const existing = queries.getUserByName.get(username.trim());
  if (existing) {
    return res.status(409).json({ error: 'Ese usuario ya existe' });
  }
  const hash = hashPassword(password);
  const result = queries.createUser.run(username.trim(), hash);
  const user = queries.getUserById.get(result.lastInsertRowid);
  const token = createToken(user);
  setAuthCookie(res, token);
  res.json({ id: user.id, username: user.username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contrasena requeridos' });
  }
  const user = queries.getUserByName.get(username.trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }
  const token = createToken(user);
  setAuthCookie(res, token);
  res.json({ id: user.id, username: user.username });
});

app.post('/api/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json({ id: req.user.sub, username: req.user.username, is_admin: req.user.is_admin ? 1 : 0 });
});

app.get('/api/games', (req, res) => {
  const games = queries.getAllGames.all();
  res.json(games);
});

async function fetchOpenRooms(gameId) {
  const url = new URL('/list', NETPLAY_SERVER_URL);
  url.searchParams.set('game_id', String(gameId));
  const resp = await fetch(url);
  if (!resp.ok) return {};
  return resp.json();
}

app.get('/api/rooms', authRequired, async (req, res) => {
  const gameId = parseInt(req.query.game_id, 10);
  if (!gameId) {
    return res.status(400).json({ error: 'game_id requerido' });
  }
  try {
    const rooms = await fetchOpenRooms(gameId);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar salas' });
  }
});

app.post('/api/rooms', authRequired, async (req, res) => {
  const gameId = parseInt(req.body.game_id, 10);
  const roomName = (req.body.room_name || '').trim();
  const maxPlayers = parseInt(req.body.max_players, 10) || 4;
  const password = req.body.password || null;

  if (!gameId || !roomName) {
    return res.status(400).json({ error: 'game_id y room_name requeridos' });
  }
  const game = queries.getGameById.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Juego no encontrado' });
  }
  if (maxPlayers < 1 || maxPlayers > game.max_players) {
    return res.status(400).json({ error: `max_players debe ser entre 1 y ${game.max_players}` });
  }

  const roomId = generateRoomId();
  queries.createRoom.run({
    room_id: roomId,
    game_id: gameId,
    room_name: roomName,
    max_players: maxPlayers,
    password: password,
    host_user_id: req.user.sub
  });

  res.json({ room_id: roomId, game_id: gameId, room_name: roomName, max_players: maxPlayers });
});

app.delete('/api/rooms/:roomId', authRequired, (req, res) => {
  const room = queries.getRoom.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }
  if (room.host_user_id !== req.user.sub) {
    return res.status(403).json({ error: 'Solo el host puede eliminar la sala' });
  }
  queries.deleteRoom.run(req.params.roomId);
  res.json({ ok: true });
});

function renderErrorPage({ title, message, code }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Friends Party Retro</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="container" style="display:flex; align-items:center; justify-content:center; min-height:100vh;">
    <div class="auth-card" style="text-align:center; max-width:460px;">
      <div class="logo" style="width:64px; height:64px; margin:0 auto 18px; border-radius:14px;">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:36px; height:36px; fill:#fff;">
          <path d="M2 10.5v3h3v-3H2zm4-4v11h3v-11H6zm4-3v17h3V3.5h-3zm4 6v11h3v-11h-3zm4-3v14h3V6.5h-3z"/>
        </svg>
      </div>
      <h1 style="font-size:1.1rem; margin-bottom:10px;">${code || 'Error'}</h1>
      <p class="subtitle" style="margin-bottom:24px;">${message}</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <a href="/lobby.html" class="btn">Volver al lobby</a>
        <a href="/" class="btn secondary">Inicio</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

app.get('/play/:roomId', authRequired, (req, res) => {
  const room = queries.getRoom.get(req.params.roomId);
  if (!room) {
    return res.status(404).type('html').send(renderErrorPage({
      title: 'Sala no encontrada',
      code: 'SALA NO ENCONTRADA',
      message: 'La sala que buscas no existe o ya fue cerrada.'
    }));
  }
  const game = queries.getGameById.get(room.game_id);
  if (!game) {
    return res.status(404).type('html').send(renderErrorPage({
      title: 'Juego no encontrado',
      code: 'JUEGO NO ENCONTRADO',
      message: 'El juego asociado a esta sala ya no está disponible.'
    }));
  }

  const turnUrl = process.env.TURN_URL || '';
  const turnUser = process.env.TURN_USER || '';
  const turnCred = process.env.TURN_CRED || '';
  const stunUrl = process.env.STUN_URL || 'stun:stun.l.google.com:19302';

  const isHost = room.host_user_id === req.user.sub;

  const html = renderPlayPage({
    game,
    room,
    username: req.user.username,
    userId: req.user.sub,
    isHost,
    stunUrl,
    turnUrl,
    turnUser,
    turnCred
  });
  res.type('html').send(html);
});

function renderPlayPage({ game, room, username, userId, isHost, stunUrl, turnUrl, turnUser, turnCred }) {
  const iceServers = [{ urls: stunUrl }];
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred
    });
  }
  const iceJson = JSON.stringify(iceServers);
  const passwordJson = room.password ? JSON.stringify(room.password) : 'null';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${game.name} - friends-party-retro</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div id="topbar">
    <a href="/lobby.html">&larr; Salir al lobby</a>
    <span>${game.name} | Sala: ${room.room_name}</span>
  </div>
  <div style="width:640px;height:480px;max-width:100%;margin:20px auto;">
    <div id="game"></div>
  </div>

  <script>
    EJS_player = '#game';
    EJS_core = '${game.core}';
    EJS_gameUrl = '${game.rom_path}';
    EJS_gameID = ${game.id};
    EJS_gameName = '${game.name.replace(/'/g, "\\'")}';
    EJS_pathtodata = '/data/';
    EJS_startOnLoaded = true;
    EJS_netplayServer = '';
    EJS_netplayICEServers = ${iceJson};
    EJS_DEBUG_XX = true;

    window.ROOM_ID = '${room.room_id}';
    window.PLAYER_ID = '${userId}';
    window.PLAYER_NAME = '${username.replace(/'/g, "\\'")}';
    window.ROOM_PASSWORD = ${passwordJson};
    window.NETPLAY_SERVER_URL = '${NETPLAY_SERVER_URL}';
    window.IS_HOST = ${isHost ? 'true' : 'false'};
    window.ROOM_NAME = '${room.room_name.replace(/'/g, "\\'")}';
    window.MAX_PLAYERS = ${room.max_players};
  </script>
  <script src="/data/src/socket.io.min.js"></script>
  <script src="/data/loader.js"></script>
  <script src="/js/netplay-client.js"></script>
</body>
</html>`;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== ADMIN ROUTES ====================

// GET /api/admin/games - List all games
app.get('/api/admin/games', adminRequired, (req, res) => {
  const games = queries.getAllGames.all();
  res.json(games);
});

// POST /api/admin/games - Create game with ROM + optional cover
app.post('/api/admin/games', adminRequired, (req, res) => {
  uploadGameFiles(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Error al subir archivos: ' + err.message });
    }

    const { name, system, core, max_players, description } = req.body;
    if (!name || !system || !core) {
      return res.status(400).json({ error: 'Nombre, sistema y core son requeridos' });
    }
    if (!req.files || !req.files.rom || !req.files.rom[0]) {
      return res.status(400).json({ error: 'El archivo ROM es requerido' });
    }

    const romPath = '/roms/' + req.files.rom[0].filename;
    const coverPath = (req.files.cover && req.files.cover[0])
      ? '/covers/' + req.files.cover[0].filename
      : null;

    const result = queries.createGame.run({
      name: name.trim(),
      system: system.trim(),
      core: core.trim(),
      rom_path: romPath,
      max_players: parseInt(max_players, 10) || 2,
      description: (description || '').trim() || null,
      cover_path: coverPath
    });

    const game = queries.getGameById.get(result.lastInsertRowid);
    res.status(201).json(game);
  });
});

// PUT /api/admin/games/:id - Update game
app.put('/api/admin/games/:id', adminRequired, (req, res) => {
  const game = queries.getGameById.get(parseInt(req.params.id, 10));
  if (!game) {
    return res.status(404).json({ error: 'Juego no encontrado' });
  }

  uploadGameFiles(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Error al subir archivos: ' + err.message });
    }

    const { name, system, core, max_players, description } = req.body;

    let romPath = game.rom_path;
    if (req.files && req.files.rom && req.files.rom[0]) {
      deleteFile(game.rom_path);
      romPath = '/roms/' + req.files.rom[0].filename;
    }

    let coverPath = game.cover_path;
    if (req.files && req.files.cover && req.files.cover[0]) {
      if (game.cover_path) deleteFile(game.cover_path);
      coverPath = '/covers/' + req.files.cover[0].filename;
    }

    queries.updateGame.run({
      id: game.id,
      name: (name || game.name).trim(),
      system: (system || game.system).trim(),
      core: (core || game.core).trim(),
      max_players: parseInt(max_players, 10) || game.max_players,
      description: description !== undefined ? (description || '').trim() || null : game.description,
      cover_path: coverPath
    });

    const updated = queries.getGameById.get(game.id);
    res.json(updated);
  });
});

// DELETE /api/admin/games/:id - Delete game + files
app.delete('/api/admin/games/:id', adminRequired, (req, res) => {
  const game = queries.getGameById.get(parseInt(req.params.id, 10));
  if (!game) {
    return res.status(404).json({ error: 'Juego no encontrado' });
  }

  // Delete files from disk
  deleteFile(game.rom_path);
  if (game.cover_path) {
    deleteFile(game.cover_path);
  }

  queries.deleteGame.run(game.id);
  res.json({ ok: true });
});

// GET /api/admin/users - List all users
app.get('/api/admin/users', adminRequired, (req, res) => {
  const users = queries.getAllUsers.all();
  res.json(users);
});

// DELETE /api/admin/users/:id - Delete user
app.delete('/api/admin/users/:id', adminRequired, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (userId === req.user.sub) {
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  }
  const result = queries.deleteUser.run(userId, 'admin');
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  res.json({ ok: true });
});

// ==================== END ADMIN ROUTES ====================

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  if (req.path === '/' || req.path === '/index.html') {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  if (req.path === '/lobby' || req.path === '/lobby.html') {
    return res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
  }
  if (req.path === '/admin' || req.path === '/admin.html') {
    return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  }
  next();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`App corriendo en http://0.0.0.0:${PORT}`);
  console.log(`Netplay server: ${NETPLAY_SERVER_URL}`);
});