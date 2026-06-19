#!/usr/bin/env bash
#
# Arranca el stack local definido en stack.config.json + docker/docker-compose.yml.
#
# Uso:
#   ./run.sh                 → solo MySQL (desarrollar la API con `pnpm dev:api`)
#   ./run.sh full            → todas las piezas habilitadas (API dockerizada + proxy)
#   ./run.sh api             → MySQL + API dockerizada + proxy
#   ./run.sh backoffice      → MySQL + proxy (el backoffice se sirve desde el host)
#   ./run.sh web             → MySQL + proxy (la web se sirve desde el host)
#   ./run.sh mobile          → MySQL (la app mobile se sirve desde el host)
#
# Las piezas activas, sus subdominios (*.aj-local.es) y puertos se leen de
# stack.config.json. URLs sin puerto: Caddy enruta por host.
#
# Flags:
#   --setup-hosts            → añade a /etc/hosts (con sudo) las entradas que falten
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="${SCRIPT_DIR}/docker"
CONFIG="${SCRIPT_DIR}/stack.config.json"

MODE="db"
SETUP_HOSTS=0
for arg in "$@"; do
  case "${arg}" in
    --setup-hosts) SETUP_HOSTS=1 ;;
    db|full|api|backoffice|web|mobile) MODE="${arg}" ;;
    *) echo "✗ Argumento desconocido: ${arg}" >&2; exit 1 ;;
  esac
done

# --- Comprobaciones de tooling ------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker no está instalado o no está en PATH" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "✗ jq no está instalado (necesario para leer stack.config.json)" >&2
  exit 1
fi
if [ ! -f "${CONFIG}" ]; then
  echo "✗ No existe ${CONFIG}. Copia stack.config.example.json a stack.config.json." >&2
  exit 1
fi

if [ ! -f "${DOCKER_DIR}/.env" ]; then
  echo "→ docker/.env no existe, lo creo a partir de docker/.env.example"
  cp "${DOCKER_DIR}/.env.example" "${DOCKER_DIR}/.env"
fi

# --- Lectura de la config -----------------------------------------------------
LOCAL_BASE="$(jq -r '.domains.localBase' "${CONFIG}")"
LOCAL_SCHEME="$(jq -r '.environments.local.scheme' "${CONFIG}")"
ENABLED_PARTS="$(jq -r '.parts | to_entries[] | select(.value.enabled) | .key' "${CONFIG}")"

part_field() { jq -r ".parts.\"$1\".$2" "${CONFIG}"; }

run_mode_of() {
  local part="$1" rm
  rm="$(jq -r ".parts.\"${part}\".runMode // empty" "${CONFIG}")"
  if [ -n "${rm}" ]; then echo "${rm}"; return; fi
  # Default: la API en docker, los frontends en el host.
  if [ "${part}" = "api" ]; then echo "docker"; else echo "host"; fi
}

url_of() {
  local part="$1" sub
  sub="$(part_field "${part}" subdomain)"
  echo "${LOCAL_SCHEME}://${sub}.${LOCAL_BASE}"
}

# --- Generación del Caddyfile -------------------------------------------------
CADDYFILE="${DOCKER_DIR}/Caddyfile"
{
  echo "# Generado por run.sh desde stack.config.json — no editar a mano."
  for part in ${ENABLED_PARTS}; do
    sub="$(part_field "${part}" subdomain)"
    port="$(part_field "${part}" internalPort)"
    rm="$(run_mode_of "${part}")"
    if [ "${rm}" = "docker" ]; then
      upstream="${part}:${port}"
    else
      upstream="host.docker.internal:${port}"
    fi
    echo ""
    echo "${sub}.${LOCAL_BASE} {"
    printf '\treverse_proxy %s\n' "${upstream}"
    echo "}"
  done
} > "${CADDYFILE}"
echo "→ Caddyfile regenerado (${CADDYFILE})"

# --- /etc/hosts ---------------------------------------------------------------
HOST_NAMES=""
for part in ${ENABLED_PARTS}; do
  sub="$(part_field "${part}" subdomain)"
  HOST_NAMES="${HOST_NAMES} ${sub}.${LOCAL_BASE}"
done
HOST_NAMES="$(echo "${HOST_NAMES}" | xargs)"  # trim

MISSING=""
for name in ${HOST_NAMES}; do
  if ! grep -qE "(^|[[:space:]])${name}([[:space:]]|\$)" /etc/hosts 2>/dev/null; then
    MISSING="${MISSING} ${name}"
  fi
done
MISSING="$(echo "${MISSING}" | xargs || true)"

if [ -n "${MISSING}" ]; then
  HOSTS_LINE="127.0.0.1 ${MISSING}"
  if [ "${SETUP_HOSTS}" = "1" ]; then
    echo "→ Añadiendo a /etc/hosts (sudo): ${MISSING}"
    echo "${HOSTS_LINE}" | sudo tee -a /etc/hosts >/dev/null
  else
    echo ""
    echo "⚠ Faltan entradas en /etc/hosts. Añade esta línea (o usa --setup-hosts):"
    echo "    ${HOSTS_LINE}"
    echo ""
  fi
fi

# --- Cableado entre piezas (env) ----------------------------------------------
# CORS de la API = URLs de los frontends habilitados.
CORS_LIST=""
for part in backoffice web mobile; do
  if echo "${ENABLED_PARTS}" | grep -qx "${part}"; then
    CORS_LIST="${CORS_LIST}${CORS_LIST:+,}$(url_of "${part}")"
  fi
done
export CORS_ORIGINS="${CORS_LIST}"

API_URL=""
if echo "${ENABLED_PARTS}" | grep -qx "api"; then
  API_URL="$(url_of api)"
fi

# --- Arranque de Docker -------------------------------------------------------
cd "${DOCKER_DIR}"
case "${MODE}" in
  db)
    echo "→ Levantando solo MySQL…"
    docker compose up -d --build mysql
    ;;
  full)
    echo "→ Levantando todas las piezas habilitadas (perfil full)…"
    docker compose --profile full up -d --build
    ;;
  api|backoffice|web)
    echo "→ Levantando MySQL + proxy (perfil ${MODE})…"
    docker compose --profile "${MODE}" up -d --build
    ;;
  mobile)
    echo "→ Levantando solo MySQL (mobile corre en el host)…"
    docker compose up -d --build mysql
    ;;
esac

# --- Resumen ------------------------------------------------------------------
echo ""
echo "✓ Stack arrancando (entorno local, base ${LOCAL_BASE})"
for part in ${ENABLED_PARTS}; do
  printf "  %-11s %s\n" "${part}:" "$(url_of "${part}")"
done

# Comandos para las piezas que corren en el host (runMode host) según el modo.
print_host_cmd() {
  local part="$1" port api_env
  port="$(part_field "${part}" internalPort)"
  case "${part}" in
    backoffice)
      api_env="${API_URL:+VITE_API_URL=${API_URL} }"
      echo "  ${api_env}pnpm --filter @core/backoffice dev -- --port ${port}"
      ;;
    web)
      api_env="${API_URL:+PUBLIC_API_URL=${API_URL} }"
      echo "  ${api_env}pnpm --filter @core/web dev -- --port ${port}"
      ;;
    mobile)
      api_env="${API_URL:+VITE_API_URL=${API_URL} }"
      echo "  ${api_env}pnpm --filter @core/mobile dev -- --port ${port}"
      ;;
  esac
}

HOST_PARTS=""
case "${MODE}" in
  full) HOST_PARTS="${ENABLED_PARTS}" ;;
  backoffice|web|mobile) HOST_PARTS="${MODE}" ;;
esac

PRINTED_HEADER=0
for part in ${HOST_PARTS}; do
  [ "$(run_mode_of "${part}")" = "host" ] || continue
  echo "${ENABLED_PARTS}" | grep -qx "${part}" || continue
  if [ "${PRINTED_HEADER}" = "0" ]; then
    echo ""
    echo "Arranca en el host (en otra terminal):"
    PRINTED_HEADER=1
  fi
  print_host_cmd "${part}"
done

cat <<EOF

Comandos útiles:
  Logs:    docker compose -f docker/docker-compose.yml logs -f
  Estado:  docker compose -f docker/docker-compose.yml ps
  Parar:   docker compose -f docker/docker-compose.yml --profile full down
  Reset:   docker compose -f docker/docker-compose.yml --profile full down -v   # ⚠️ borra los datos
EOF
