(function () {
  if (typeof io === 'undefined') {
    console.error('socket.io no cargado. El netplay no funcionara.');
    return;
  }

  const ROOM_ID = window.ROOM_ID;
  const PLAYER_ID = window.PLAYER_ID;
  const PLAYER_NAME = window.PLAYER_NAME;
  const ROOM_PASSWORD = window.ROOM_PASSWORD || sessionStorage.getItem('joinPassword') || null;

  if (!ROOM_ID || !PLAYER_ID || !PLAYER_NAME) {
    console.error('Faltan datos de sala (ROOM_ID, PLAYER_ID, PLAYER_NAME)');
    return;
  }

  const NETPLAY_URL = window.NETPLAY_SERVER_URL || (window.location.protocol + '//' + window.location.hostname + ':3000');
  const sock = io(NETPLAY_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });

  const isHost = sessionStorage.getItem('joinPassword') !== null || !window.__alreadyJoined;

  sock.on('connect', () => {
    console.log('[netplay] Conectado al netplay server');
    const extra = {
      sessionid: ROOM_ID,
      userid: PLAYER_ID,
      player_name: PLAYER_NAME,
      room_name: ROOM_ID,
      game_id: String(window.EJS_gameID || 1),
      domain: 'retro'
    };

    const action = window.__isHost ? 'open-room' : 'join-room';
    const payload = { extra, password: ROOM_PASSWORD || undefined };

    sock.emit(action, payload, (err, players) => {
      if (err) {
        console.error('[netplay] Error al ' + action + ':', err);
        alert('Error al unirse a la sala: ' + err);
        location.href = '/lobby.html';
        return;
      }
      console.log('[netplay] Sala ' + (action === 'open-room' ? 'creada' : 'unido'), players || '');
    });
  });

  sock.on('users-updated', (players) => {
    console.log('[netplay] Jugadores en sala:', players);
    const count = Object.keys(players || {}).length;
    const bar = document.getElementById('topbar');
    if (bar) {
      bar.querySelector('span').textContent =
        (window.EJS_gameName || 'Juego') + ' | ' + (window.__roomName || 'Sala') + ' | ' + count + ' jugador(es)';
    }
  });

  sock.on('webrtc-signal', (data) => {
    console.log('[netplay] WebRTC signal de', data.sender);
    window.__netplaySignal && window.__netplaySignal(data);
  });

  sock.on('input', (data) => {
    window.__netplayInput && window.__netplayInput(data);
  });

  sock.on('snapshot', (data) => {
    window.__netplaySnapshot && window.__netplaySnapshot(data);
  });

  sock.on('data-message', (data) => {
    window.__netplayData && window.__netplayData(data);
  });

  sock.on('disconnect', () => {
    console.warn('[netplay] Desconectado del netplay server');
  });

  window.__retroSocket = sock;
  window.__isHost = false;
})();