// ecosystem.config.js - Config de PM2 para friends-party-retro
// Ejecutar: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'lobby',
      script: '/srv/retro/app/server.js',
      cwd: '/srv/retro/app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        DB_PATH: '/srv/retro/db/users.sqlite',
        NETPLAY_SERVER_URL: 'http://localhost:3000',
        JWT_SECRET: 'CAMBIAR_ESTE_SECRET_EN_PRODUCCION',
        TURN_URL: 'turn:IP_PUBLICA:3478',
        TURN_USER: 'retro',
        TURN_CRED: 'TU_SECRETO_COTURN',
        STUN_URL: 'stun:stun.l.google.com:19302'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/friends-party-retro/lobby-error.log',
      out_file: '/var/log/friends-party-retro/lobby-out.log',
      max_memory_restart: '150M',
      autorestart: true,
      watch: false
    },
    {
      name: 'netplay',
      script: '/opt/emulatorjs-netplay/server.js',
      cwd: '/opt/emulatorjs-netplay',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/friends-party-retro/netplay-error.log',
      out_file: '/var/log/friends-party-retro/netplay-out.log',
      max_memory_restart: '100M',
      autorestart: true,
      watch: false
    }
  ]
};