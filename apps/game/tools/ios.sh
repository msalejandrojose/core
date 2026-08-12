#!/usr/bin/env bash
#
# Equivalente a `npx cap sync ios` / `npx cap open ios` para el proyecto Godot.
#
#   ./tools/ios.sh sync   → regenera el proyecto Xcode desde el proyecto Godot
#   ./tools/ios.sh open   → abre ese proyecto Xcode
#   ./tools/ios.sh run    → sync + open, que es el ciclo normal
#
# Requisitos previos (una sola vez, ver docs/ios.md):
#   1. Export templates de Godot instaladas
#   2. Un preset llamado "iOS" en export_presets.cfg
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$PROJECT_DIR/build/ios"
XCODEPROJ="$BUILD_DIR/Racing.xcodeproj"
PRESET="iOS"

die() { echo "error: $*" >&2; exit 1; }

require_godot() {
	command -v godot >/dev/null 2>&1 || die "godot no está en el PATH (brew install --cask godot)"
}

require_templates() {
	local version
	version="$(godot --version 2>/dev/null | head -1 | cut -d. -f1-3)"
	local dir="$HOME/Library/Application Support/Godot/export_templates"
	[ -d "$dir" ] && [ -n "$(ls -A "$dir" 2>/dev/null)" ] || die \
"faltan las export templates de Godot.
  Instálalas desde el editor: Editor → Gestionar plantillas de exportación → Descargar e instalar.
  Son ~1 GB y solo hace falta hacerlo una vez por versión del motor (esta: $version)."
}

require_preset() {
	grep -q "name=\"$PRESET\"" "$PROJECT_DIR/export_presets.cfg" 2>/dev/null || die \
"no hay un preset llamado \"$PRESET\".
  Créalo una vez desde el editor: Proyecto → Exportar → Añadir → iOS.
  Marca «Export Project Only» y pon un Bundle Identifier propio.
  Detalle completo en docs/ios.md."
}

cmd_sync() {
	require_godot
	require_templates
	require_preset

	mkdir -p "$BUILD_DIR"
	echo "→ exportando a $XCODEPROJ"
	# --export-debug y no --export-release: en debug el binario no exige
	# certificado de distribución, que es lo que quieres para probar.
	godot --headless --path "$PROJECT_DIR" --export-debug "$PRESET" "$XCODEPROJ"
	echo "✓ listo"
}

cmd_open() {
	[ -d "$XCODEPROJ" ] || die "no existe $XCODEPROJ — corre primero: $0 sync"
	open "$XCODEPROJ"
}

case "${1:-run}" in
	sync) cmd_sync ;;
	open) cmd_open ;;
	run)  cmd_sync; cmd_open ;;
	*)    die "uso: $0 [sync|open|run]" ;;
esac
