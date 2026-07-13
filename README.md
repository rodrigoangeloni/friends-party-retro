<div align="center">

# 🎮 Friends Party Retro

### Plataforma self-hosted para jugar juegos retro online con amigos

[![License](https://img.shields.io/badge/license-Personal-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com)
[![EmulatorJS](https://img.shields.io/badge/EmulatorJS-4.2-orange.svg)](https://github.com/EmulatorJS/EmulatorJS)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-red.svg)](#)
[![Status](https://img.shields.io/badge/status-MVP-yellow.svg)](#)

**Plataforma web self-hosted para jugar juegos retro online** mediante emuladores en el navegador. Corre en cualquier dispositivo con Node.js 18+ — Linux, Windows, macOS, Raspberry Pi o una OrangePi PC.

[Características](#-características) ·
[Arquitectura](#-arquitectura) ·
[Rápido inicio](#-rápido-inicio) ·
[Documentación](#-documentación) ·
[Créditos](#-créditos)

</div>

---

## ✨ Características

- 🔐 **Registro y autenticación** de usuarios (JWT + bcrypt)
- 🕹️ **Emulación en navegador** via EmulatorJS (WebAssembly/RetroArch)
- 🏠 **Salas de juego** con creación y unión en tiempo real
- 🎯 **Misma versión garantizada** del emulador y ROM para todos los jugadores
- 🎮 **Netplay P2P** via WebRTC con servidor TURN de respaldo
- 🛡️ **Panel de administración** web para gestionar juegos y usuarios
- 📦 **Sin build step** — HTML/CSS/JS vanilla en el frontend
- 🍓 **Ligero** — ~360 MB RAM en uso total, corre en hardware modesto

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Navegador (Cliente)                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │   Lobby (HTML)  │  │  EmulatorJS      │  │  Netplay Client   │ │
│  │   + Admin Panel │  │  (WASM + Canvas) │  │  (socket.io)      │ │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬──────────┘ │
└───────────┼─────────────────────┼──────────────────────┼──────────┘
            │ HTTP                 │ Estático             │ WebSocket
            ▼                      ▼                      ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Servidor (Host)                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                     Nginx (Puerto 80)                       │  │
│  │            Reverse Proxy + SharedArrayBuffer Headers       │  │
│  └───────┬───────────────────────────────────────┬─────────────┘  │
│          ▼                                       ▼                │
│  ┌────────────────┐                    ┌──────────────────────┐   │
│  │  App Express   │                    │  Netplay Server      │   │
│  │  (Puerto 8080) │                    │  (Puerto 3000)       │   │
│  │  - Auth        │                    │  - Salas             │   │
│  │  - Lobby API   │                    │  - Signaling WebRTC  │   │
│  │  - Admin Panel │                    │  - Relay jugadores   │   │
│  │  - EmulatorJS  │                    │                      │   │
│  │  - SQLite DB   │                    │  Socket.io + Express │   │
│  └────────────────┘                    └──────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| **Emulación** | [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) | 4.2 |
| **Netplay** | [EmulatorJS-Netplay](https://github.com/EmulatorJS/EmulatorJS-Netplay) | upstream |
| **Backend** | Express + better-sqlite3 + bcryptjs + JWT | 4.x |
| **Frontend** | HTML/CSS/JS vanilla (no build step) | - |
| **Base de datos** | SQLite (WAL mode) | 11.x |
| **TURN** | coturn (solo producción) | - |
| **Procesos** | PM2 (solo producción) | - |
| **Host** | Cualquier PC/server con Node.js 18+ (~360 MB RAM) | - |

## 🚀 Rápido inicio

### Prerequisitos

- Node.js v18+
- npm

### Instalación

```bash

git clone https://github.com/rodrigoangeloni/friends-party-retro.git
cd friends-party-retro


cd app && npm install
cd ../netplay-server && npm install
cd ..


cp -r app/node_modules/@emulatorjs/emulatorjs/data/* app/public/data/


mkdir -p app/public/roms
cp "Ultimate Mortal Kombat 3 (USA).sfc" app/public/roms/mk3_ultimate.sfc
```

### Ejecutar

```bash

# Terminal 1: Netplay server
cd netplay-server && node server.js  # → http://localhost:3000

# Terminal 2: App server
cd app && node server.js             # → http://localhost:8080
```

Abrir `http://localhost:8080` en el navegador.

### Credenciales admin

- Usuario: `admin`
- Contraseña: `admin123` (configurable via `ADMIN_PASSWORD`)

## 📁 Estructura del proyecto

```
friends-party-retro/
├── app/                        # App custom (auth + lobby + admin)
│   ├── server.js               # Backend Express (endpoints + renderPlayPage)
│   ├── db.js                   # SQLite: users, games, active_rooms
│   ├── auth.js                 # JWT + bcrypt + middleware (authRequired, adminRequired)
│   ├── upload.js               # Multer para ROMs + covers
│   └── public/                 # Frontend
│       ├── index.html          # Login + registro
│       ├── lobby.html          # Selección de juego + creación de salas
│       ├── admin.html          # Panel de administración
│       ├── css/style.css       # Tema oscuro arcade
│       ├── js/
│       │   ├── auth.js         # Lógica client-side de auth
│       │   ├── lobby.js        # Selección de juego + CRUD de salas
│       │   ├── admin.js        # Panel admin (upload, gestión)
│       │   └── netplay-client.js  # Socket.io bridge → EmulatorJS
│       ├── data/               # EmulatorJS (npm package, .gitignored)
│       ├── roms/               # ROMs (.gitignored)
│       └── covers/             # Portadas (.gitignored)
├── netplay-server/             # EmulatorJS-Netplay (sin modificar)
├── config/
│   ├── nginx.conf              # Reverse proxy + WebSocket + SharedArrayBuffer
│   └── turnserver.conf         # coturn TURN
├── scripts/
│   ├── install.sh              # Instalación asistida (Linux)
│   └── update-cores.sh         # Actualizar cores desde CDN
├── ecosystem.config.js         # PM2: lobby + netplay
├── .gitignore
├── AGENTS.md                   # Guía para AI agents
├── PLAN.md                     # Plan completo del proyecto
├── PLAN-ADMIN.md               # Plan del panel admin
└── DEPLOY.md                   # Guía de despliegue en producción
```

## 🔌 Endpoints API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/register` | - | Registrar usuario |
| `POST` | `/api/login` | - | Iniciar sesión |
| `POST` | `/api/logout` | - | Cerrar sesión |
| `GET` | `/api/me` | ✅ | Usuario actual |
| `GET` | `/api/games` | - | Lista de juegos |
| `GET` | `/api/rooms?game_id=N` | ✅ | Salas abiertas |
| `POST` | `/api/rooms` | ✅ | Crear sala |
| `DELETE` | `/api/rooms/:id` | ✅ | Eliminar sala (host) |
| `GET` | `/play/:roomId` | ✅ | Página del emulador |
| `GET` | `/api/health` | - | Health check |
| `GET` | `/api/admin/games` | 🔑 | Lista juegos (admin) |
| `POST` | `/api/admin/games` | 🔑 | Crear juego (upload ROM + cover) |
| `PUT` | `/api/admin/games/:id` | 🔑 | Editar juego |
| `DELETE` | `/api/admin/games/:id` | 🔑 | Eliminar juego + archivos |
| `GET` | `/api/admin/users` | 🔑 | Lista usuarios (admin) |
| `DELETE` | `/api/admin/users/:id` | 🔑 | Eliminar usuario |

## 📦 Descarga de archivos EmulatorJS

Los archivos de EmulatorJS y los cores se descargan del paquete npm `@emulatorjs/emulatorjs`, **NO** del CDN:

```bash
# Copiar archivos completos de EmulatorJS (loader, src/, localization, compression)
cp -r app/node_modules/@emulatorjs/emulatorjs/data/* app/public/data/
```

| Archivo | Tamaño aprox. | Origen |
|---|---|---|
| `loader.js` | 7 KB | npm package |
| `src/emulator.js` | 334 KB | npm package |
| `src/socket.io.min.js` | 46 KB | npm package |
| `localization/es-ES.json` | 3 KB | npm package |
| `compression/*.js` | ~500 KB | npm package |

> ⚠️ **Importante**: No usar el CDN `cdn.emulatorjs.org/latest/data/emulator.min.zip` — contiene un ES module que rompe en `<script>` tags regulares.

## 📋 Requisitos mínimos

| Componente | Requisito |
|---|---|
| **Node.js** | v18+ |
| **RAM** | ~360 MB (para ambos procesos) |
| **OS** | Linux, Windows, macOS |
| **Red** | Puerto 80/8080/3000 abiertos (solo host) |
| **Disco** | ~100 MB + espacio para ROMs |

> 💡 **Ejemplo**: Una OrangePi PC (Allwinner H3, ARMv7, 1GB RAM) con Armbian corre el proyecto perfectamente.

## 🚀 Despliegue en producción

Para despliegue con **Nginx + coturn + PM2**, ver [`DEPLOY.md`](DEPLOY.md) (guía detallada para Linux).

```bash
# Instalación asistida (Linux)
chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

## 📝 Documentación

- [PLAN.md](PLAN.md) — Arquitectura, decisiones y plan completo
- [PLAN-ADMIN.md](PLAN-ADMIN.md) — Plan del panel de administración
- [DEPLOY.md](DEPLOY.md) — Guía de despliegue en producción
- [AGENTS.md](AGENTS.md) — Guía técnica para AI agents

## ⚙️ Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `ADMIN_PASSWORD` | `admin123` | Contraseña del admin |
| `JWT_SECRET` | `cambia-esto-...` | Secreto para JWT (cambiar en producción) |
| `NETPLAY_SERVER_URL` | `http://localhost:3000` | URL del netplay server |
| `TURN_URL` | - | URL del servidor TURN |
| `TURN_USER` | - | Usuario TURN |
| `TURN_CRED` | - | Credencial TURN |
| `STUN_URL` | `stun:stun.l.google.com:19302` | URL del servidor STUN |
| `DB_PATH` | `app/db/users.sqlite` | Ruta de la base de datos |
| `PORT` | `8080` | Puerto de la app |

## 📜 Licencia

Proyecto personal. EmulatorJS es Apache-2.0, el netplay server también.

---

## 👨‍💻 Autor

Hecho con pasión por [Rodrigo Angeloni](https://github.com/rodrigoangeloni).

## 🙏 Agradecimientos

- [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) — Motor de emulación (RetroArch → WASM)
- [EmulatorJS-Netplay](https://github.com/EmulatorJS/EmulatorJS-Netplay) — Servidor de netplay
- [Express](https://expressjs.com) — Framework web minimalista
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite3 síncrono para Node.js

---

⭐ Si te gusta el proyecto, [dale una estrella en GitHub](https://github.com/rodrigoangeloni/friends-party-retro). ⭐
