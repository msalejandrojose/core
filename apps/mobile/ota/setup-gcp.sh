#!/usr/bin/env bash
# Guarda (una vez) en GCP Secret Manager lo que necesita el workflow
# `Publish Brío OTA` para publicar sin el Mac, y deja que la cuenta de servicio
# del despliegue (`github-deploy`) lo lea:
#
#   ota-signing-key      la clave privada de firma de las OTA (la misma para
#                        todas las apps: cada app lleva su ota/public.pem)
#   ota-publisher-login  OTA_EMAIL=… y OTA_PASSWORD=… de un usuario del
#                        backoffice con permiso de escritura en `ota.bundles`
#
#   apps/mobile/ota/setup-gcp.sh [ruta/a/private.pem]   (por defecto ota/private.pem)
#
# Requiere gcloud con permisos de owner en el proyecto y que ya exista
# `github-deploy` (apps/api/deploy/setup-github-deploy.sh). Se puede ejecutar
# en Cloud Shell. Volver a ejecutarlo añade una versión nueva de cada secreto
# (p. ej. al cambiar la contraseña).
set -euo pipefail

PROJECT="${PROJECT:-core-502518}"
DEPLOYER_SA="${DEPLOYER_SA:-github-deploy@${PROJECT}.iam.gserviceaccount.com}"
KEY_SECRET="${KEY_SECRET:-ota-signing-key}"
LOGIN_SECRET="${LOGIN_SECRET:-ota-publisher-login}"
HERE="$(cd "$(dirname "$0")" && pwd)"
KEY="${1:-$HERE/private.pem}"
G=(gcloud --project "$PROJECT" --quiet)

[ -f "$KEY" ] || { echo "✖ No encuentro la clave privada en $KEY"; exit 1; }

# La privada tiene que casar con la pública que llevan las apps.
node -e "
const c=require('crypto'),fs=require('fs');
try{
const s=c.privateEncrypt({key:fs.readFileSync(process.argv[1]),padding:c.constants.RSA_PKCS1_PADDING},Buffer.from('ok'));
if(c.publicDecrypt({key:fs.readFileSync(process.argv[2]),padding:c.constants.RSA_PKCS1_PADDING},s).toString()!=='ok')process.exit(1)
}catch{process.exit(1)}" \
  "$KEY" "$HERE/public.pem" || { echo "✖ La clave privada no casa con ota/public.pem."; exit 1; }

"${G[@]}" services enable secretmanager.googleapis.com

put() { # put <secreto> <fichero>
  if "${G[@]}" secrets describe "$1" >/dev/null 2>&1; then
    "${G[@]}" secrets versions add "$1" --data-file "$2" >/dev/null
  else
    "${G[@]}" secrets create "$1" --replication-policy automatic --data-file "$2" >/dev/null
  fi
  "${G[@]}" secrets add-iam-policy-binding "$1" \
    --member "serviceAccount:$DEPLOYER_SA" --role roles/secretmanager.secretAccessor >/dev/null
  echo "✔ $1"
}

put "$KEY_SECRET" "$KEY"

read -rp "Email del backoffice (usuario para publicar): " email
read -rsp "Contraseña: " password; echo
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
chmod 600 "$tmp"
printf 'OTA_EMAIL=%s\nOTA_PASSWORD=%s\n' "$email" "$password" >"$tmp"
put "$LOGIN_SECRET" "$tmp"

echo "Listo: el próximo push a brio-dev que toque la app publicará la OTA."
