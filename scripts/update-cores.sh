#!/bin/bash
# update-cores.sh - Actualizar cores de EmulatorJS en la OrangePi
# Ejecutar como root: sudo bash scripts/update-cores.sh
set -e

CORES_DIR="/srv/retro/cores"
BASE_URL="https://cdn.emulatorjs.org/0.4.53/data"

echo "=== Actualizando cores de EmulatorJS ==="
echo "Directorio: $CORES_DIR"
echo "URL base: $BASE_URL"

mkdir -p "$CORES_DIR"

download_core() {
  local name=$1
  echo "  Descargando ${name}..."
  curl -sL "${BASE_URL}/${name}.wasm" -o "${CORES_DIR}/${name}.wasm" || echo "    WARN: No se pudo descargar ${name}.wasm"
  curl -sL "${BASE_URL}/${name}.data" -o "${CORES_DIR}/${name}.data" || echo "    WARN: No se pudo descargar ${name}.data"
}

download_core "snes9x"

echo ""
echo "Cores descargados:"
ls -lh "$CORES_DIR"/*.wasm 2>/dev/null || echo "  No se encontraron cores WASM"
echo ""
echo "Para actualizar mas consolas, agregar al script:"
echo "  download_core 'fceumm'      # NES"
echo "  download_core 'mgba'        # GBA"
echo "  download_core 'genesis_plus_gx'  # Genesis"
echo "  download_core 'pcsx_rearmed' # PS1"
echo "  download_core 'mupen64plus_next' # N64"