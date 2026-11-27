#!/usr/bin/env bash
# Despliega la API de Brío en Cloud Run.
#
#   apps/api/deploy/deploy.sh            # sube el secreto, construye, migra y despliega
#   apps/api/deploy/deploy.sh ci         # construye, migra y despliega (GitHub Actions: el secreto ya está en Secret Manager)
#   apps/api/deploy/deploy.sh build      # solo construye y sube la imagen (GitHub Actions, en paralelo con los tests)
#   apps/api/deploy/deploy.sh release    # migra (si hace falta) y despliega la imagen ya construida de este commit
#   apps/api/deploy/deploy.sh migrate    # construye y aplica las migraciones pendientes, sin desplegar
#   apps/api/deploy/deploy.sh secrets    # sube apps/api/.env.cloudrun como nueva versión del secreto y redespliega
#   apps/api/deploy/deploy.sh seed       # ejecuta los seeds (catálogo, IAM, agentes) contra la BBDD de producción
#
# Las migraciones (`prisma migrate deploy`) corren en el job de Cloud Run
# `brio-api-migrate` (la misma imagen que el servicio, con otro comando) justo
# antes de desplegar: si fallan, el despliegue se
# para y sigue sirviendo la versión anterior. En `ci` y `release` el job solo se
# ejecuta si cambia apps/api/prisma/migrations/ entre el commit desplegado (el
# de la etiqueta de la imagen que sirve Cloud Run) y este; si no se puede saber,
# se ejecuta. FORCE_MIGRATE=1 lo ejecuta siempre.
#
# Requiere gcloud con sesión iniciada. Ver deploy/README.md.
set -euo pipefail

PROJECT="${PROJECT:-core-502518}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-brio-api}"
REPO="${REPO:-brio}"
SECRET="${SECRET:-brio-api-env}"
SA="${SERVICE}@${PROJECT}.iam.gserviceaccount.com"

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
API="$ROOT/apps/api"
# IMAGE_TAG lo fija el workflow para que el job de build y el de release usen la
# misma etiqueta (git puede alargar el hash corto si el historial es completo).
TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD)}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/api:${TAG}"
MIGRATIONS="apps/api/prisma/migrations"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
# El job de migraciones usa la misma imagen que el servicio con este comando.
# Terraform (infra/terraform/modules/cloud-run-api) declara lo mismo: se pasa
# también aquí para que funcione aunque aún no se haya aplicado.
MIGRATE_CMD=(--command /app/node_modules/.bin/prisma --args migrate,deploy)
G=(gcloud --project "$PROJECT" --quiet)

ensure_base() {
  "${G[@]}" artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1 ||
    "${G[@]}" artifacts repositories create "$REPO" --location "$REGION" --repository-format docker
  "${G[@]}" iam service-accounts describe "$SA" >/dev/null 2>&1 ||
    "${G[@]}" iam service-accounts create "$SERVICE" --display-name "Brío API (Cloud Run)"
}

push_secret() {
  [ -f "$API/.env.cloudrun" ] || { echo "Falta $API/.env.cloudrun"; exit 1; }
  if "${G[@]}" secrets describe "$SECRET" >/dev/null 2>&1; then
    "${G[@]}" secrets versions add "$SECRET" --data-file "$API/.env.cloudrun"
  else
    "${G[@]}" secrets create "$SECRET" --replication-policy automatic --data-file "$API/.env.cloudrun"
  fi
  "${G[@]}" secrets add-iam-policy-binding "$SECRET" \
    --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
}

build() {
  "${G[@]}" builds submit "$ROOT" --region "$REGION" \
    --config "$API/deploy/cloudbuild.yaml" --substitutions "_IMAGE=$IMAGE"
}

# Aplica las migraciones pendientes con la imagen de este commit.
# Si el job ya existe (lo gestiona Terraform) solo se cambia la imagen; la
# primera vez se crea con toda su configuración.
migrate() {
  if "${G[@]}" run jobs describe "${SERVICE}-migrate" --region "$REGION" >/dev/null 2>&1; then
    "${G[@]}" run jobs update "${SERVICE}-migrate" --region "$REGION" --image "$IMAGE" "${MIGRATE_CMD[@]}"
  else
    "${G[@]}" run jobs deploy "${SERVICE}-migrate" --region "$REGION" --image "$IMAGE" "${MIGRATE_CMD[@]}" \
      --service-account "$SA" \
      --set-secrets "/secrets/.env=${SECRET}:latest" \
      --max-retries 0 --task-timeout 600
  fi
  "${G[@]}" run jobs execute "${SERVICE}-migrate" --region "$REGION" --wait
}

current_image() {
  "${G[@]}" run services describe "$SERVICE" --region "$REGION" --format 'value(spec.template.spec.containers[0].image)'
}

# ¿Hay migraciones nuevas desde lo que está desplegado? Ante la duda, sí.
needs_migrate() {
  if [ "${FORCE_MIGRATE:-}" = 1 ]; then echo "› Migraciones: forzadas (FORCE_MIGRATE=1)."; return 0; fi
  local image deployed
  image="$(current_image 2>/dev/null || true)"
  deployed="${image##*/api:}"
  if [ -z "$image" ] || [ "$deployed" = "$image" ]; then
    echo "› Migraciones: no sé qué commit está desplegado ($image), se ejecutan."; return 0
  fi
  if ! git -C "$ROOT" cat-file -e "${deployed}^{commit}" 2>/dev/null; then
    echo "› Migraciones: el commit desplegado ($deployed) no está en el historial, se ejecutan."; return 0
  fi
  if git -C "$ROOT" diff --quiet "$deployed" HEAD -- "$MIGRATIONS"; then
    echo "› Migraciones: ninguna nueva desde $deployed, no se ejecuta el job."; return 1
  fi
  echo "› Migraciones nuevas desde $deployed:"
  git -C "$ROOT" diff --name-only --diff-filter=A "$deployed" HEAD -- "$MIGRATIONS" | sed 's/^/    /'
  return 0
}

# Como migrate, pero sin ejecutar el job si no hay migraciones nuevas. El job se
# apunta igualmente a la imagen nueva: así se puede relanzar a mano y la
# limpieza de Artifact Registry puede borrar las anteriores.
migrate_if_needed() {
  if needs_migrate; then
    migrate
  elif "${G[@]}" run jobs describe "${SERVICE}-migrate" --region "$REGION" >/dev/null 2>&1; then
    "${G[@]}" run jobs update "${SERVICE}-migrate" --region "$REGION" --image "$IMAGE" "${MIGRATE_CMD[@]}"
  else
    migrate
  fi
}

# Si el servicio ya existe, su configuración (variables, secretos, CPU,
# escalado…) la gestiona Terraform (infra/terraform/envs/brio-dev) y aquí solo
# se cambia la imagen: un `gcloud run deploy` completo borraría las variables
# que añade Terraform (p. ej. EDGE_ORIGIN_SECRET). La primera vez se crea con
# la configuración de siempre.
deploy() {
  local image="$1"; shift
  if "${G[@]}" run services describe "$SERVICE" --region "$REGION" >/dev/null 2>&1; then
    "${G[@]}" run services update "$SERVICE" --region "$REGION" --image "$image" "$@"
    return
  fi
  "${G[@]}" run deploy "$SERVICE" --region "$REGION" --image "$image" \
    --service-account "$SA" \
    --env-vars-file "$API/deploy/cloudrun.env.yaml" \
    --set-secrets "/secrets/.env=${SECRET}:latest" \
    --allow-unauthenticated \
    --cpu 1 --memory 512Mi --cpu-boost \
    --min-instances 0 --max-instances 1 \
    --concurrency 40 --timeout 120
}

# Tras un despliegue correcto deja en Artifact Registry solo la imagen que sirve
# Cloud Run (volver atrás = revertir en git y desplegar). Si algo falla antes
# (tests, build, migración o despliegue) no se llega aquí y no se borra nada; las
# imágenes de builds que no llegaron a desplegarse se borran en el siguiente
# despliegue correcto. También borra las `api-migrate` de antes de la imagen única.
prune_images() {
  local live keep d
  live="$(current_image)"
  if [ "$live" != "$IMAGE" ]; then
    echo "› Limpieza: Cloud Run sirve ${live:-?}, no $IMAGE; no se borra nada."; return 0
  fi
  keep="$("${G[@]}" artifacts docker images describe "$IMAGE" --format 'value(image_summary.digest)' 2>/dev/null || true)"
  if [[ "$keep" != sha256:* ]]; then
    echo "› Limpieza: no sé el digest de $IMAGE; no se borra nada."; return 1
  fi
  echo "› Limpieza: se queda $IMAGE ($keep)."
  while read -r d; do
    if [ -z "$d" ] || [ "$d" = "$keep" ]; then continue; fi
    echo "    borrando api@$d"
    "${G[@]}" artifacts docker images delete "$REGISTRY/api@$d" --delete-tags >/dev/null || return 1
  done < <("${G[@]}" artifacts docker images list "$REGISTRY/api" --format 'value(version)')
  if "${G[@]}" artifacts packages describe api-migrate --repository "$REPO" --location "$REGION" >/dev/null 2>&1; then
    echo "    borrando api-migrate (ya no se usa)"
    "${G[@]}" artifacts packages delete api-migrate --repository "$REPO" --location "$REGION" >/dev/null || return 1
  fi
}

# El despliegue ya está hecho: si la limpieza falla, se avisa y ya.
prune() {
  prune_images || echo "⚠ No se pudieron borrar las imágenes viejas de Artifact Registry (el despliegue está hecho)."
}

seed() {
  local image; image="$(current_image)"
  "${G[@]}" run jobs deploy "${SERVICE}-seed" --region "$REGION" --image "$image" \
    --service-account "$SA" \
    --env-vars-file "$API/deploy/cloudrun.env.yaml" \
    --set-secrets "/secrets/.env=${SECRET}:latest" \
    --command sh \
    --args=-c,"node dist/seeds/seed-iam.js && node dist/seeds/sync-api-sections.js && node dist/seeds/seed-sections.js && node dist/seeds/seed-brio.js && node dist/seeds/seed-agents.js" \
    --max-retries 0 --task-timeout 900
  "${G[@]}" run jobs execute "${SERVICE}-seed" --region "$REGION" --wait
}

case "${1:-all}" in
  # Revisión nueva (sufijo) para que la API relea el secreto aunque la imagen no cambie.
  secrets) ensure_base; push_secret; deploy "$(current_image)" --revision-suffix "s$(date +%s)" ;;
  seed) seed ;;
  all) ensure_base; push_secret; build; migrate; deploy "$IMAGE"; prune ;;
  ci) build; migrate_if_needed; deploy "$IMAGE"; prune ;;
  build) build ;;
  release) migrate_if_needed; deploy "$IMAGE"; prune ;;
  migrate) build; migrate ;;
  *) echo "Uso: $0 [all|ci|build|release|migrate|secrets|seed]"; exit 1 ;;
esac
