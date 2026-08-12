#!/usr/bin/env bash
#
# Corre todos los arneses de prueba del juego.
#
# Dos cosas que no son negociables aquí y que costaron encontrar:
#
#   - SIN --headless. Sin ventana real el servidor de display reporta 0x0, la
#     transformación del viewport se degenera y los toques inyectados llegan
#     multiplicados ~30x. Los tests de input darían falsos negativos.
#   - CON --quit-after. Si un script no compila, Godot se queda corriendo la
#     escena vacía con la ventana abierta y hay que matarlo a mano.
#
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v godot >/dev/null 2>&1 || {
	echo "error: godot no está en el PATH (brew install --cask godot)" >&2
	exit 1
}

failed=0
total_ok=0

for scene in "$PROJECT_DIR"/tests/*_test.tscn; do
	name="$(basename "$scene" .tscn)"
	log="$(mktemp)"

	godot --path "$PROJECT_DIR" --quit-after 2400 "res://tests/$name.tscn" > "$log" 2>&1
	code=$?

	ok="$(grep -cE '^  ok ' "$log" || true)"
	bad="$(grep -cE 'FALLA' "$log" || true)"
	total_ok=$(( total_ok + ok ))

	if [ "$code" -eq 0 ] && [ "$bad" -eq 0 ]; then
		printf '  \033[32mok\033[0m    %-26s %s comprobaciones\n' "$name" "$ok"
	else
		printf '  \033[31mFALLA\033[0m %-26s %s fallos\n' "$name" "$bad"
		grep -E 'FALLA|SCRIPT ERROR|Parse Error' "$log" | head -10 | sed 's/^/        /'
		failed=1
	fi

	rm -f "$log"
done

echo
if [ "$failed" -eq 0 ]; then
	echo "OK — $total_ok comprobaciones"
else
	echo "Hay fallos."
fi
exit "$failed"
