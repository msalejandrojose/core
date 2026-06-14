#!/usr/bin/env bash
#
# Construye y levanta el stack local definido en docker/docker-compose.yml
#
# Uso:
#   ./run.sh           → solo MySQL (para desarrollar la API con `pnpm dev:api`)
#   ./run.sh full      → MySQL + API dockerizada
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="${SCRIPT_DIR}/docker"
MODE="${1:-db}"

cd "${DOCKER_DIR}"

if [ ! -f .env ]; then
  echo "→ docker/.env no existe, lo creo a partir de docker/.env.example"
  cp .env.example .env
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker no está instalado o no está en PATH" >&2
  exit 1
fi

case "${MODE}" in
  db)
    echo "→ Levantando solo MySQL..."
    docker compose up -d --build mysql
    ;;
  full)
    echo "→ Levantando MySQL + API..."
    docker compose --profile full up -d --build
    ;;
  *)
    echo "✗ Modo desconocido: ${MODE}. Usa: ./run.sh [db|full]" >&2
    exit 1
    ;;
esac

PORT="$(grep -E '^MYSQL_PORT=' .env | cut -d= -f2)"
DB="$(grep -E '^MYSQL_DATABASE=' .env | cut -d= -f2)"
USER="$(grep -E '^MYSQL_USER=' .env | cut -d= -f2)"
API_PORT="$(grep -E '^API_PORT=' .env | cut -d= -f2 || echo 3000)"

cat <<EOF

✓ Stack arrancando
  MySQL:  localhost:${PORT}   (db=${DB}, user=${USER})
EOF

if [ "${MODE}" = "full" ]; then
  cat <<EOF
  API:    http://localhost:${API_PORT}   (docs en /docs)
EOF
fi

cat <<EOF

Comandos útiles:
  Logs:    docker compose -f docker/docker-compose.yml logs -f
  Estado:  docker compose -f docker/docker-compose.yml ps
  Parar:   docker compose -f docker/docker-compose.yml --profile full down
  Reset:   docker compose -f docker/docker-compose.yml --profile full down -v   # ⚠️ borra los datos
EOF
