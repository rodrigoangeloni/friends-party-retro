const Database = require('better-sqlite3');
const path = require('path');
const { hashPassword } = require('./auth');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db', 'users.sqlite');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin      INTEGER DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id           INTEGER PRIMARY KEY,
      name         TEXT NOT NULL,
      system       TEXT NOT NULL,
      core         TEXT NOT NULL,
      rom_path     TEXT NOT NULL,
      max_players  INTEGER DEFAULT 4,
      description  TEXT,
      cover_path   TEXT
    );

    CREATE TABLE IF NOT EXISTS active_rooms (
      room_id      TEXT PRIMARY KEY,
      game_id      INTEGER NOT NULL,
      room_name    TEXT NOT NULL,
      max_players  INTEGER NOT NULL,
      password     TEXT,
      host_user_id INTEGER NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
  `);

  // Seed admin user
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminUser) {
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = hashPassword(adminPass);
    db.prepare('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)').run('admin', hash);
    console.log('[DB] Usuario admin creado (admin/' + adminPass + ')');
  }

  // Seed MK3 if no games exist
  const count = db.prepare('SELECT COUNT(*) as c FROM games').get();
  if (count.c === 0) {
    db.prepare(`
      INSERT INTO games (id, name, system, core, rom_path, max_players, description, cover_path)
      VALUES (@id, @name, @system, @core, @rom_path, @max_players, @description, @cover_path)
    `).run({
      id: 1,
      name: 'Mortal Kombat 3 Ultimate',
      system: 'snes',
      core: 'snes9x',
      rom_path: '/roms/mk3_ultimate.sfc',
      max_players: 2,
      description: 'Fighting 1v1',
      cover_path: null
    });
  }
}

init();

const queries = {
  // Users
  createUser: db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)'),
  getUserByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserById: db.prepare('SELECT id, username, is_admin, created_at FROM users WHERE id = ?'),
  getAllUsers: db.prepare('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ? AND username != ?'),

  // Games
  getAllGames: db.prepare('SELECT * FROM games ORDER BY name'),
  getGameById: db.prepare('SELECT * FROM games WHERE id = ?'),
  createGame: db.prepare(`
    INSERT INTO games (name, system, core, rom_path, max_players, description, cover_path)
    VALUES (@name, @system, @core, @rom_path, @max_players, @description, @cover_path)
  `),
  updateGame: db.prepare(`
    UPDATE games SET name=@name, system=@system, core=@core, max_players=@max_players,
    description=@description, cover_path=@cover_path WHERE id=@id
  `),
  deleteGame: db.prepare('DELETE FROM games WHERE id = ?'),

  // Rooms
  createRoom: db.prepare(`
    INSERT INTO active_rooms (room_id, game_id, room_name, max_players, password, host_user_id)
    VALUES (@room_id, @game_id, @room_name, @max_players, @password, @host_user_id)
  `),
  getRoom: db.prepare('SELECT * FROM active_rooms WHERE room_id = ?'),
  deleteRoom: db.prepare('DELETE FROM active_rooms WHERE room_id = ?')
};

module.exports = { db, queries };