#!/bin/bash
# install.sh - Instalacion completa de friends-party-retro en OrangePi (Armbian/Debian)
# Ejecutar como root: sudo bash install.sh
set -e

echo "=== friends-party-retro: Instalando en OrangePi ==="

# --- 1. Dependencias del sistema ---
echo "[1/10] Instalando dependencias del sistema..."
apt-get update
apt-get install -y curl git sqlite3 nginx coturn build-essential

# --- 2. Node.js v20 LTS ---
echo "[2/10] Instalando Node.js v20 LTS..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  Node.js: $(node -v)"

# --- 3. PM2 ---
echo "[3/10] Instalando PM2..."
npm install -g pm2

# --- 4. Crear estructura de directorios ---
echo "[4/10] Creando estructura de directorios..."
mkdir -p /srv/retro/{roms,cores,data,db,app/public/{css,js}}
mkdir -p /opt/emulatorjs-netplay

# --- 5. Clonar EmulatorJS (assets) ---
echo "[5/10] Descargando EmulatorJS..."
if [ ! -d /opt/emulatorjs ]; then
  git clone --depth 1 https://github.com/EmulatorJS/EmulatorJS /opt/emulatorjs
fi
# Copiar assets data/ a /srv/retro/data/
cp -r /opt/emulatorjs/data/* /srv/retro/data/

# --- 6. Descargar core snes9x ---
echo "[6/10] Descargando core snes9x..."
SNES_CORE_URL="https://cdn.emulatorjs.org/0.4.53"
curl -sL "${SNES_CORE_URL}/data/snes9x.wasm" -o /srv/retro/cores/snes9x.wasm
curl -sL "${SNES_CORE_URL}/data/snes9x.data" -o /srv/retro/cores/snes9x.data
echo "  Core snes9x descargado: $(ls -lh /srv/retro/cores/snes9x.wasm 2>/dev/null || echo 'ERROR')"

# --- 7. Clonar e instalar netplay server ---
echo "[7/10] Instalando netplay server (EmulatorJS-Netplay)..."
if [ ! -d /opt/emulatorjs-netplay/server.js ]; then
  git clone --depth 1 -b main https://github.com/EmulatorJS/EmulatorJS-Netplay /opt/emulatorjs-netplay
fi
cd /opt/emulatorjs-netplay
npm install express socket.io cors
cd -

# --- 8. Copiar app custom ---
echo "[8/10] Copiando app custom..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")/app"
cp -r "$APP_DIR"/* /srv/retro/app/
cd /srv/retro/app
npm install --production
cd -

# --- 9. Configurar Nginx ---
echo "[9/10] Configurando Nginx..."
cp "$(dirname "$0")/../config/nginx.conf" /etc/nginx/sites-available/retro
ln -sf /etc/nginx/sites-available/retro /etc/nginx/sites-enabled/retro
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# --- 10. Configurar coturn ---
echo "[10/10] Configurando coturn..."
TURN_SECRET=$(turnadmin --generate-secret 2>/dev/null || echo "CAMBIAR_ESTE_SECRETO")
sed -i "s|GENERAR_CON_turnadmin --generate-secret|$TURN_SECRET|" /etc/turnserver.conf

echo ""
echo "=== INSTALACION COMPLETADA ==="
echo ""
echo "Siguientes pasos:"
echo "  1. Edita /etc/turnserver.conf - cambia external-ip y realm"
echo "  2. Sube ROMs a /srv/retro/roms/"
echo "  3. Registra juegos en la DB: cd /srv/retro/app && node -e \"const{db}=require('./db'); db.close()\""
echo "  4. Arranca los servicios con: pm2 start /srv/retro/ecosystem.config.js"
echo "  5. Abre puertos en el router: 80, 3000, 3478, 49152-49200"
echo "  6. Verifica con: pm2 status && curl http://localhost/api/health"
echo ""
echo "Credenciales de TURN (para el navegador):"
echo "  URL: turn://<ip_orangepi>:3478"
echo "  Secret: $TURN_SECRET"