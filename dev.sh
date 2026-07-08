#!/usr/bin/env bash
#
# Levanta el stack completo para desarrollo, cada pieza en su propia terminal/panel.
#
# Flujo:
#   1. Arranca el stack Docker (MySQL + API dockerizada + proxy) reutilizando run.sh.
#   2. Abre un panel/terminal por cada pieza habilitada en stack.config.json:
#        - piezas en runMode "docker" → siguen sus logs (docker compose logs -f).
#        - piezas en runMode "host"   → lanzan su servidor de desarrollo (pnpm … dev).
#
# Uso:
#   ./dev.sh                  → run.sh full + un panel por pieza (tmux si está disponible)
#   ./dev.sh --mode tmux      → fuerza tmux (una ventana con paneles en mosaico)
#   ./dev.sh --mode terminal  → abre ventanas nativas (macOS Terminal.app / Linux gnome-terminal…)
#   ./dev.sh --no-docker      → no relanza el stack Docker (asume que ya está arriba)
#   ./dev.sh --setup-hosts    → se lo pasa a run.sh (añade entradas a /etc/hosts con sudo)
#
# Las piezas activas, sus puertos y runMode se leen de stack.config.json, igual
# que en run.sh. Para incluir la app mobile, ponla como "enabled": true ahí.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="${SCRIPT_DIR}/docker"
COMPOSE="${DOCKER_DIR}/docker-compose.yml"
CONFIG="${SCRIPT_DIR}/stack.config.json"

MODE="auto"          # auto | tmux | terminal
RUN_DOCKER=1
SETUP_HOSTS=0
for arg in "$@"; do
  case "${arg}" in
    --mode) : ;;                              # el valor se coge abajo
    tmux|terminal|auto) MODE="${arg}" ;;
    --mode=*) MODE="${arg#--mode=}" ;;
    --no-docker) RUN_DOCKER=0 ;;
    --setup-hosts) SETUP_HOSTS=1 ;;
    *) echo "✗ Argumento desconocido: ${arg}" >&2; exit 1 ;;
  esac
done

# --- Comprobaciones -----------------------------------------------------------
if ! command -v jq >/dev/null 2>&1; then
  echo "✗ jq no está instalado (necesario para leer stack.config.json)" >&2
  exit 1
fi
if [ ! -f "${CONFIG}" ]; then
  echo "✗ No existe ${CONFIG}. Copia stack.config.example.json a stack.config.json." >&2
  exit 1
fi

# --- Lectura de la config (misma lógica que run.sh) ---------------------------
LOCAL_BASE="$(jq -r '.domains.localBase' "${CONFIG}")"
LOCAL_SCHEME="$(jq -r '.environments.local.scheme' "${CONFIG}")"
ENABLED_PARTS="$(jq -r '.parts | to_entries[] | select(.value.enabled) | .key' "${CONFIG}")"

part_field() { jq -r ".parts.\"$1\".$2" "${CONFIG}"; }

run_mode_of() {
  local part="$1" rm
  rm="$(jq -r ".parts.\"${part}\".runMode // empty" "${CONFIG}")"
  if [ -n "${rm}" ]; then echo "${rm}"; return; fi
  if [ "${part}" = "api" ]; then echo "docker"; else echo "host"; fi
}

# URL de la API para cablear los frontends (VITE_API_URL / PUBLIC_API_URL).
API_URL=""
if echo "${ENABLED_PARTS}" | grep -qx "api"; then
  API_URL="${LOCAL_SCHEME}://$(part_field api subdomain).${LOCAL_BASE}"
fi

# Comando que corre cada pieza en su panel.
cmd_for() {
  local part="$1" port rm api_env
  port="$(part_field "${part}" internalPort)"
  rm="$(run_mode_of "${part}")"
  if [ "${rm}" = "docker" ]; then
    echo "docker compose -f '${COMPOSE}' logs -f ${part}"
    return
  fi
  case "${part}" in
    api)        echo "pnpm dev:api" ;;
    backoffice) api_env="${API_URL:+VITE_API_URL=${API_URL} }"
                echo "${api_env}pnpm --filter @core/backoffice dev -- --port ${port}" ;;
    web)        api_env="${API_URL:+PUBLIC_API_URL=${API_URL} }"
                echo "${api_env}pnpm --filter @core/web dev -- --port ${port}" ;;
    mobile)     api_env="${API_URL:+VITE_API_URL=${API_URL} }"
                echo "${api_env}pnpm --filter @core/mobile dev -- --port ${port}" ;;
    *)          echo "echo 'Sin comando definido para ${part}'; exec \$SHELL" ;;
  esac
}

# --- 1. Arranque del stack Docker (vía run.sh) --------------------------------
if [ "${RUN_DOCKER}" = "1" ]; then
  RUN_ARGS=(full)
  [ "${SETUP_HOSTS}" = "1" ] && RUN_ARGS+=(--setup-hosts)
  echo "→ Arrancando stack Docker: ./run.sh ${RUN_ARGS[*]}"
  "${SCRIPT_DIR}/run.sh" "${RUN_ARGS[@]}"
  echo ""
fi

# --- 2. Resolución del modo ---------------------------------------------------
if [ "${MODE}" = "auto" ]; then
  if command -v tmux >/dev/null 2>&1; then MODE="tmux"; else MODE="terminal"; fi
fi

# Recolecta pares "part|cmd" de las piezas habilitadas.
PARTS=()
CMDS=()
for part in ${ENABLED_PARTS}; do
  PARTS+=("${part}")
  CMDS+=("$(cmd_for "${part}")")
done

if [ "${#PARTS[@]}" -eq 0 ]; then
  echo "✗ No hay piezas habilitadas en stack.config.json." >&2
  exit 1
fi

echo "→ Lanzando ${#PARTS[@]} panel(es) en modo '${MODE}':"
for i in "${!PARTS[@]}"; do
  printf "   %-11s %s\n" "${PARTS[$i]}:" "${CMDS[$i]}"
done
echo ""

# --- 3a. tmux -----------------------------------------------------------------
launch_tmux() {
  local session="core-dev"
  if tmux has-session -t "${session}" 2>/dev/null; then
    echo "→ Ya existe la sesión tmux '${session}'. Me conecto a ella."
    exec tmux attach -t "${session}"
  fi

  # Primer panel = primera pieza.
  tmux new-session -d -s "${session}" -n dev -c "${SCRIPT_DIR}"
  tmux send-keys -t "${session}" "printf '\\033]2;%s\\033\\\\' '${PARTS[0]}'; ${CMDS[0]}" C-m

  # Resto de piezas → split.
  for i in "${!PARTS[@]}"; do
    [ "${i}" -eq 0 ] && continue
    tmux split-window -t "${session}" -c "${SCRIPT_DIR}"
    tmux select-layout -t "${session}" tiled >/dev/null
    tmux send-keys -t "${session}" "printf '\\033]2;%s\\033\\\\' '${PARTS[$i]}'; ${CMDS[$i]}" C-m
  done

  tmux select-layout -t "${session}" tiled >/dev/null
  tmux set -t "${session}" pane-border-status top >/dev/null 2>&1 || true
  tmux set -t "${session}" pane-border-format " #{pane_index} #{pane_title} " >/dev/null 2>&1 || true
  tmux select-pane -t "${session}.0" >/dev/null

  echo "✓ Sesión tmux '${session}' lista. Ctrl-b d para desconectar; 'tmux kill-session -t ${session}' para cerrar."
  exec tmux attach -t "${session}"
}

# --- 3b. Terminales nativas ---------------------------------------------------
launch_terminal_macos() {
  local i
  for i in "${!PARTS[@]}"; do
    osascript >/dev/null <<EOF
tell application "Terminal"
  do script "cd '${SCRIPT_DIR}' && echo '── ${PARTS[$i]} ──' && ${CMDS[$i]}"
  activate
end tell
EOF
  done
  echo "✓ Abiertas ${#PARTS[@]} ventanas de Terminal.app."
}

launch_terminal_linux() {
  local term i inner
  if   command -v gnome-terminal >/dev/null 2>&1; then term=gnome-terminal
  elif command -v konsole        >/dev/null 2>&1; then term=konsole
  elif command -v xterm          >/dev/null 2>&1; then term=xterm
  else
    echo "✗ No encuentro un emulador de terminal (gnome-terminal/konsole/xterm)." >&2
    echo "  Usa './dev.sh --mode tmux' o lanza los comandos a mano." >&2
    exit 1
  fi
  for i in "${!PARTS[@]}"; do
    inner="cd '${SCRIPT_DIR}' && echo '── ${PARTS[$i]} ──' && ${CMDS[$i]}; exec \$SHELL"
    case "${term}" in
      gnome-terminal) gnome-terminal --title="${PARTS[$i]}" -- bash -c "${inner}" ;;
      konsole)        konsole -p tabtitle="${PARTS[$i]}" -e bash -c "${inner}" & ;;
      xterm)          xterm -T "${PARTS[$i]}" -e bash -c "${inner}" & ;;
    esac
  done
  echo "✓ Abiertas ${#PARTS[@]} ventanas de ${term}."
}

case "${MODE}" in
  tmux)
    command -v tmux >/dev/null 2>&1 || { echo "✗ tmux no está instalado." >&2; exit 1; }
    launch_tmux
    ;;
  terminal)
    case "$(uname -s)" in
      Darwin) launch_terminal_macos ;;
      Linux)  launch_terminal_linux ;;
      *)      echo "✗ SO no soportado para --mode terminal. Usa --mode tmux." >&2; exit 1 ;;
    esac
    ;;
  *)
    echo "✗ Modo desconocido: ${MODE} (usa tmux | terminal | auto)" >&2
    exit 1
    ;;
esac
