# DEPLOY.md - Guia de despliegue en OrangePi PC (Armbian/Debian)

## Requisitos previos

- OrangePi PC (1GB RAM, Allwinner H3, ARMv7)
- Tarjeta SD (8GB+, clase A2 recomendada)
- Armbian/Debian instalado y funcionando
- Acceso SSH a la OrangePi
- Tarjeta con ROMs de SNES (ej: Mortal Kombat 3 Ultimate)

## Paso 1: Preparar la OrangePi

```bash
# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Crear usuario para la plataforma (opcional pero recomendado)
sudo useradd -m -s /bin/bash retro
sudo usermod -aG sudo retro
```

## Paso 2: Transferir el proyecto

Desde tu PC, copia el proyecto a la OrangePi:

```bash
scp -r friends-party-retro/ retro@IP_ORANGEPI:/tmp/
```

O si tienes git:
```bash
ssh retro@IP_ORANGEPI
git clone TU_REPO_URL /tmp/friends-party-retro
```

## Paso 3: Ejecutar el instalador

```bash
ssh retro@IP_ORANGEPI
cd /tmp/friends-party-retro
sudo bash scripts/install.sh
```

El instalador:
1. Instala Node.js v20 LTS, PM2, Nginx, coturn, SQLite
2. Descarga EmulatorJS y el core snes9x
3. Instala el netplay server (server.js de EmulatorJS)
4. Copia la app custom a /srv/retro/app/
5. Configura Nginx como reverse proxy
6. Configura coturn como TURN server
7. Inicia los servicios con PM2

## Paso 4: Configurar coturn

Edita `/etc/turnserver.conf`:

```bash
sudo nano /etc/turnserver.conf
```

Cambiar:
- `external-ip=IP_PUBLICA_DE_LA_ORANGEPI` → tu IP pública real
- `realm=retro.example.com` → tu dominio o IP
- `static-auth-secret=...` → generado por el instalador

Obtener tu IP pública:
```bash
curl -s ifconfig.me
```

Reiniciar coturn:
```bash
sudo systemctl restart coturn
sudo systemctl enable coturn
```

## Paso 5: Subir ROMs

```bash
# Copiar ROMs desde tu PC
scp /ruta/a/mk3_ultimate.smc retro@IP_ORANGEPI:/srv/retro/roms/

# Verificar
ls -lh /srv/retro/roms/
```

Registrar el juego en la DB (ya viene pre-cargado MK3, pero para agregar más):

```bash
cd /srv/retro/app
node -e "
const { queries } = require('./db');
// Ejemplo: Super Mario World
queries.run('INSERT OR IGNORE INTO games (id, name, system, core, rom_path, max_players, description) VALUES (2, \"Super Mario World\", \"snes\", \"snes9x\", \"/roms/smw.smc\", 4, \"Plataforma\")');
// Ejemplo: Street Fighter II
queries.run('INSERT OR IGNORE INTO games (id, name, system, core, rom_path, max_players, description) VALUES (3, \"Street Fighter II Turbo\", \"snes\", \"snes9x\", \"/roms/sf2.smc\", 2, \"Fighting 1v1\")');
"
```

## Paso 6: Configurar secrets de seguridad

Cambia los valores por defecto:

```bash
# Generar un JWT_SECRET seguro
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET"

# Generar secreto de TURN
TURN_SECRET=$(turnadmin --generate-secret 2>/dev/null || echo "CAMBIAR")
echo "TURN_SECRET=$TURN_SECRET"

# Actualizar ecosystem.config.js
nano /srv/retro/ecosystem.config.js
# Cambiar JWT_SECRET, TURN_URL, TURN_USER, TURN_CRED, STUN_URL
```

## Paso 7: Iniciar los servicios

```bash
# Crear directorio de logs
sudo mkdir -p /var/log/friends-party-retro
sudo chown retro:retro /var/log/friends-party-retro

# Iniciar con PM2
cd /srv/retro
pm2 start ecosystem.config.js

# Verificar
pm2 status
curl http://localhost/api/health

# Auto-arranque al reiniciar
pm2 startup
pm2 save
```

## Paso 8: Configurar router (port forwarding)

En la interfaz de tu router, abrir estos puertos hacia la IP interna de la OrangePi:

| Puerto | Protocolo | Servicio |
|---|---|---|
| 80 | TCP | Web (Nginx) |
| 3000 | TCP | Netplay server (socket.io) |
| 3478 | TCP+UDP | coturn (TURN) |
| 49152-49200 | UDP | coturn relay media |

Verificar que los puertos están abiertos desde internet:
- https://canyouseeme.org (puerto 80)
- Usar un WebRTC tester para el TURN

## Paso 9: Probar

1. Abre `http://IP_PUBLICA_ORANGEPI` en tu navegador
2. Regístrate con un usuario
3. Ve al lobby, selecciona MK3 Ultimate
4. Crea una sala
5. Desde otro dispositivo/navegador, entra con otro usuario y únete a la sala
6. Verifica que el juego carga y los controles funcionan

## Paso 10: IP dinámica (opcional)

Si tu IP pública cambia, configura DDNS con DuckDNS (gratis):

```bash
# Instalar cliente DuckDNS
mkdir -p /opt/duckdns
cat > /opt/duckdns/duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=TU_SUBDOMINIO&token=TU_TOKEN&ip=" | curl -k -o /opt/duckdns/duck.log -K -
EOF
chmod +x /opt/duckdns/duck.sh

# Actualizar cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1") | crontab -
```

Después usa `TU_SUBDOMINIO.duckdns.org` en vez de la IP.

## Comandos útiles

```bash
# Ver estado de servicios
pm2 status

# Ver logs
pm2 logs lobby
pm2 logs netplay

# Reiniciar
pm2 restart lobby
pm2 restart netplay

# Detener todo
pm2 stop all

# Verificar puertos abiertos
ss -tlnp | grep -E '(80|3000|3478)'

# Verificar RAM disponible
free -h

# Verificar disco
df -h /srv/retro

# Acceder a la DB
sqlite3 /srv/retro/db/users.sqlite "SELECT * FROM users;"
sqlite3 /srv/retro/db/users.sqlite "SELECT * FROM games;"

# Actualizar netplay server
cd /opt/emulatorjs-netplay && git pull && npm install && pm2 restart netplay

# Actualizar cores
sudo bash scripts/update-cores.sh
```

## Troubleshooting

### El juego no carga en el navegador
- Verifica que el core snes9x existe: `ls -lh /srv/retro/cores/snes9x.*`
- Verifica que el ROM existe: `ls -lh /srv/retro/roms/mk3_ultimate.smc`
- Revisa logs de Nginx: `tail -f /var/log/nginx/error.log`
- Verifica CORS en Nginx: el header `Access-Control-Allow-Origin` debe estar presente

### El netplay no conecta
- Verifica que socket.io corre: `curl http://localhost:3000/list?game_id=1`
- Revisa logs: `pm2 logs netplay`
- Verifica que el puerto 3000 está abierto: `ss -tlnp | grep 3000`
- Verifica WebSocket desde el navegador (Chrome DevTools > Network > WS)

### Los jugadores no se conectan P2P
- Verifica que coturn corre: `systemctl status coturn`
- Verifica puertos UDP 49152-49200 abiertos en router
- Prueba con un servidor STUN/TURN online: https://webrtc.github.io/samples/src/content/peerconnection/triple-ice/
- Revisa la config de `EJS_netplayServers` en el navegador (verificar TURN URL)

### La OrangePi se queda sin RAM
- `free -h` para ver uso
- `pm2 logs` para ver qué proceso usa más
- Opción rápida: fusionar lobby + netplay en un solo proceso (editando server.js para incluir la lógica de netplay server)
- Opcional: añadir swap `sudo fallocate -l 512M /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`