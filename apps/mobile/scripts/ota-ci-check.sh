#!/usr/bin/env bash
# ¿Se puede publicar por OTA lo que hay entre la última OTA publicada y ahora?
# Lo usa .github/workflows/publish-brio-ota.yml antes de publicar.
#
#   apps/mobile/scripts/ota-ci-check.sh <base> <head>
#
# <base> es el commit de la última OTA publicada (el último despliegue de GitHub
# del entorno ota-<appId>) o, si no hay, el commit anterior. Escribe
# `publish=true|false` en $GITHUB_OUTPUT (o en stdout) y explica el motivo. No
# publica si:
#   - el último commit lleva «[skip ota]» en el mensaje;
#   - desde la última OTA cambia algo nativo (plugins de Capacitor,
#     capacitor.config.ts, native/, parches de plugins) sin subir
#     `minNativeVersion` en ota/config.json: esa web podría romper en los
#     teléfonos con el build nativo actual. Si el cambio nativo no afecta a la
#     web (p. ej. solo el Swift de un widget), un commit con «[ota-native-ok]»
#     lo deja pasar.
set -euo pipefail
# Ojo con `pipefail`: `cmd | grep -q` falla cuando grep sale antes de leerlo
# todo (cmd muere con SIGPIPE, 141). Aquí se usa `grep … >/dev/null`.

BASE="${1:?base}"
HEAD="${2:?head}"
OUT="${GITHUB_OUTPUT:-/dev/stdout}"
M=apps/mobile

if [[ "$BASE" =~ ^0+$ ]] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
  BASE="$(git rev-parse "$HEAD^")"
fi

result() {
  echo "publish=$1" >>"$OUT"
  echo "$2"
}

if git log -1 --format=%B "$HEAD" | grep -iF '[skip ota]' >/dev/null; then
  result false "No se publica: el commit lleva [skip ota]."
  exit 0
fi

native=()
while IFS= read -r f; do
  case "$f" in
    "$M/capacitor.config.ts" | "$M/native/"* | patches/*) native+=("$f") ;;
  esac
done < <(git diff --name-only "$BASE" "$HEAD")
# Plugins nativos añadidos, quitados o actualizados (package.json o lockfile).
if git diff -U0 "$BASE" "$HEAD" -- "$M/package.json" pnpm-lock.yaml |
  grep -E '^[+-][^+-]' | grep -E '@capacitor|@capgo|capacitor-|cordova' >/dev/null; then
  native+=("dependencias de Capacitor")
fi

if ((${#native[@]})); then
  min() { git show "$1:$M/ota/config.json" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).minNativeVersion)}catch{console.log("")}})'; }
  if [[ "$(min "$BASE")" != "$(min "$HEAD")" ]]; then
    echo "Cambia algo nativo, pero minNativeVersion pasa a $(min "$HEAD"): solo lo recibirán los builds nativos nuevos."
  elif git log --format=%B "$BASE..$HEAD" | grep -iF '[ota-native-ok]' >/dev/null; then
    echo "Cambia algo nativo (${native[*]}), pero un commit lleva [ota-native-ok]."
  else
    result false "No se publica: desde la última OTA cambia algo nativo (${native[*]}) y minNativeVersion sigue en $(min "$HEAD"). Sube minNativeVersion en $M/ota/config.json y saca build nativo (o, si la web no depende de ese cambio, haz un commit con [ota-native-ok])."
    exit 0
  fi
fi

result true "Se publica."
