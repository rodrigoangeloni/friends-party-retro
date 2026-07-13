(function () {
  if (typeof io === 'undefined') {
    console.error('socket.io no cargado. El netplay no funcionara.');
    return;
  }

  const ROOM_ID = window.ROOM_ID;
  const PLAYER_ID = window.PLAYER_ID;
  const PLAYER_NAME = window.PLAYER_NAME;
  const ROOM_PASSWORD = window.ROOM_PASSWORD || sessionStorage.getItem('joinPassword') || null;
  const IS_HOST = window.IS_HOST;
  const ROOM_NAME = window.ROOM_NAME || ROOM_ID;
  const MAX_PLAYERS = window.MAX_PLAYERS || 4;
  const GAME_ID = String(window.EJS_gameID || 1);

  if (!ROOM_ID || !PLAYER_ID || !PLAYER_NAME) {
    console.error('Faltan datos de sala (ROOM_ID, PLAYER_ID, PLAYER_NAME)');
    return;
  }

  const NETPLAY_URL = window.NETPLAY_SERVER_URL || (window.location.protocol + '//' + window.location.hostname + ':3000');
  const sock = io(NETPLAY_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });

  sock.on('connect', () => {
    console.log('[netplay] Conectado al netplay server como', IS_HOST ? 'HOST' : 'JOINER');

    const extra = {
      sessionid: ROOM_ID,
      userid: PLAYER_ID,
      player_name: PLAYER_NAME,
      room_name: ROOM_NAME,
      game_id: GAME_ID,
      domain: 'retro'
    };

    if (IS_HOST) {
      const payload = {
        extra,
        password: ROOM_PASSWORD || undefined,
        maxPlayers: MAX_PLAYERS
      };
      sock.emit('open-room', payload, (err) => {
        if (err) {
          console.error('[netplay] Error al crear sala:', err);
          alert('Error al crear la sala: ' + err);
          location.href = '/lobby.html';
          return;
        }
        console.log('[netplay] Sala creada correctamente');
      });
    } else {
      const payload = {
        extra,
        password: ROOM_PASSWORD || undefined
      };
      sock.emit('join-room', payload, (err, players) => {
        if (err) {
          console.error('[netplay] Error al unirse a la sala:', err);
          alert('Error al unirse a la sala: ' + err);
          location.href = '/lobby.html';
          return;
        }
        console.log('[netplay] Unido a la sala. Jugadores:', players);
      });
    }
  });

  sock.on('users-updated', (players) => {
    console.log('[netplay] Jugadores en sala:', players);
    const count = Object.keys(players || {}).length;
    const bar = document.getElementById('topbar');
    if (bar) {
      const span = bar.querySelector('span');
      if (span) {
        span.textContent = (window.EJS_gameName || 'Juego') + ' | Sala: ' + (window.ROOM_NAME || 'Sala') + ' | ' + count + ' jugador(es)';
      }
    }
  });

  sock.on('webrtc-signal', (data) => {
    console.log('[netplay] WebRTC signal de', data.sender);
    if (window.__netplaySignal) window.__netplaySignal(data);
  });

  sock.on('input', (data) => {
    if (window.__netplayInput) window.__netplayInput(data);
  });

  sock.on('snapshot', (data) => {
    if (window.__netplaySnapshot) window.__netplaySnapshot(data);
  });

  sock.on('data-message', (data) => {
    if (window.__netplayData) window.__netplayData(data);
  });

  sock.on('disconnect', () => {
    console.warn('[netplay] Desconectado del netplay server');
  });

  window.__retroSocket = sock;
})();