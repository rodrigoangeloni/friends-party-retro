# AGENTS.md

## Architecture

Two separate Node.js processes must run simultaneously for the platform to work:

1. **`netplay-server/`** — EmulatorJS-Netplay (unmodified upstream). Socket.io signaling + WebRTC relay. Port 3000. `cd netplay-server && node server.js`
2. **`app/`** — Custom Express app. Auth (JWT + bcrypt), lobby API, admin panel, serves EmulatorJS static files. Port 8080. `cd app && node server.js`

Production: Nginx (port 80) reverse-proxies both. PM2 manages both processes via `ecosystem.config.js`.

## Local testing (Windows)

```bash
# Terminal 1
cd netplay-server && node server.js   # → http://localhost:3000

# Terminal 2
cd app && node server.js              # → http://localhost:8080
```

Open `http://localhost:8080`. Admin: `admin` / `admin123` (or `ADMIN_PASSWORD` env var).

Skip Nginx and coturn for local testing — Express serves static files directly.

## EmulatorJS data setup (non-obvious)

The EmulatorJS runtime files in `app/public/data/` are NOT committed (see `.gitignore`). They must be copied from the npm package:

```bash
# data/ is sourced from the @emulatorjs/emulatorjs npm package, NOT the CDN
# The CDN zip ships an ES module (emulator.min.js) that breaks in regular <script> tags
# The npm package ships src/ individual files which work correctly with loader.js
cp -r app/node_modules/@emulatorjs/emulatorjs/data/* app/public/data/
```

The play page (`renderPlayPage` in `app/server.js`) sets `EJS_DEBUG_XX = true` to force the loader to use `src/` individual files instead of `emulator.min.js`. Do not change this unless you also provide a working `emulator.min.js`.

`socket.io.min.js` is loaded via a separate `<script>` tag before `loader.js` so the `io` global is available when `netplay-client.js` runs synchronously.

## Database

SQLite at `app/db/users.sqlite` (also gitignored). Managed by `better-sqlite3`.

```
users:          id, username, password_hash, is_admin, created_at
games:          id, name, system, core, rom_path, max_players, description, cover_path
active_rooms:   room_id, game_id, room_name, max_players, password, host_user_id, created_at
```

**Schema changes require DB deletion** — there's no migration system. If you change columns in `app/db.js`, delete the DB file so `init()` recreates it:
```bash
rm app/db/users.sqlite app/db/users.sqlite-wal app/db/users.sqlite-shm
```

`db.js` seeds an `admin` user and the MK3 game on first init.

## File upload conventions

`app/upload.js` exports `uploadGameFiles` — a multer instance configured with `.fields()` for two fields: `rom` and `cover`. Use it as middleware, not `require('multer').fields(...)` (that was a bug — `require('multer')` returns the constructor, not an instance).

- ROMs → `app/public/roms/` (max 16MB, extensions: `.sfc .smc .nes .gba .gb .gbc .gen .md .zip .7z`)
- Covers → `app/public/covers/` (max 2MB, extensions: `.jpg .jpeg .png .gif .webp`)
- Filenames sanitized + prefixed with timestamp

## Frontend

Vanilla HTML/CSS/JS, no build step. Served from `app/public/`.

- `index.html` → login/register
- `lobby.html` → game selection + room creation
- `play/:roomId` → server-rendered HTML (`renderPlayPage`) injecting EmulatorJS config + `<script>` tags
- `admin.html` → admin panel (only visible if `is_admin`)
- `netplay-client.js` → socket.io client bridge to netplay server (connects to port 3000)

Play page is server-rendered (not a static file) because EmulatorJS config is injected into a template string. If you add config, escape values properly — this is HTML-in-JS.

## Admin credentials

Default: `admin` / `admin123`. Override via `ADMIN_PASSWORD` env var. The admin seed runs in `db.js init()` — changing `ADMIN_PASSWORD` after first init won't update the password (delete DB to reset).

## Key gotchas

- **Two processes**: Both `app` and `netplay-server` must run for netplay to work. The netplay-client connects to port 3000, not the app port.
- **DB recreation**: No migrations. Changing schema = delete DB file.
- **EmulatorJS source**: Use npm package, NOT CDN zip (CDN ships ES module that breaks loader).
- **`EJS_DEBUG_XX = true`**: Required — the minified bundle from CDN uses ES `export` syntax that fails in regular `<script>` tags.
- **Express version mismatch**: `app/` uses Express 4, `netplay-server/` uses Express 5. Don't copy code between them casually.
- **No tests**: No automated test suite exists. Verify manually via browser + curl.

## Production deploy

See `DEPLOY.md` for full OrangePi deployment (Armbian, Nginx, coturn, PM2).
