# AGENTS.md

## Two processes required

Both must run simultaneously for netplay to work:

1. **Netplay server**: `cd netplay-server && node server.js` → port 3000
2. **Custom app**: `cd app && node server.js` → port 8080

Local browser target: `http://localhost:8080`.

## EmulatorJS data setup

`app/public/data/` is gitignored. Populate it from the npm package, not the CDN:

```bash
cd app && npm install
cp -r node_modules/@emulatorjs/emulatorjs/data/* public/data/
```

- The CDN zip ships `emulator.min.js` as an ES module; it breaks in regular `<script>` tags.
- `app/server.js` (`renderPlayPage`) sets `EJS_DEBUG_XX = true` to force `loader.js` to use the individual `src/` files.
- The play page loads `socket.io.min.js` before `loader.js` so the `io` global exists when `netplay-client.js` runs.

## Database

SQLite at `app/db/users.sqlite` (gitignored). No migrations. If you change columns in `app/db.js`, delete the DB so `init()` recreates it:

```bash
rm app/db/users.sqlite app/db/users.sqlite-wal app/db/users.sqlite-shm
```

`db.js` seeds admin user + MK3 game on first init.

- Admin password: `ADMIN_PASSWORD` env var, or default `admin123`.
- Changing `ADMIN_PASSWORD` after init does not update the password; delete the DB to reset.

## File uploads

`app/upload.js` exports a multer instance (`uploadGameFiles`) configured with `.fields([{name:'rom'}, {name:'cover'}])`. Use it as middleware.

- ROMs: `app/public/roms/`, max 16 MB, extensions `.sfc .smc .nes .gba .gb .gbc .gen .md .zip .7z`
- Covers: `app/public/covers/`, max 2 MB, extensions `.jpg .jpeg .png .gif .webp`
- Filenames are sanitized and prefixed with a timestamp.

## Express version split

- `app/` uses Express 4.
- `netplay-server/` uses Express 5 (upstream submodule).

Don't copy middleware/routing patterns between them casually.

## Frontend

No build step. Static files in `app/public/`.

- `index.html` — login/register
- `lobby.html` — game selection + room creation
- `play/:roomId` — server-rendered HTML from `renderPlayPage`; config is injected into a template string, so escape values properly.
- `admin.html` — admin panel, visible only if `is_admin`

## No tests

No automated test suite exists. Verify manually via browser + curl.

## Production

See `DEPLOY.md` for Nginx + coturn + PM2 deployment. `ecosystem.config.js` is the PM2 entry point.
