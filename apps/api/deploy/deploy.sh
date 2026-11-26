#!/usr/bin/env bash
# Despliega la API de Brío en Cloud Run.
#
#   apps/api/deploy/deploy.sh            # sube el secreto, construye, migra y despliega
#   apps/api/deploy/deploy.sh ci         # construye, migra y despliega (GitHub Actions: el secreto ya está en Secret Manager)
#   apps/api/deploy/deploy.sh build      # solo construye y sube las imágenes (GitHub Actions, en paralelo con los tests)
#   apps/api/deploy/deploy.sh release    # migra (si hace falta) y despliega las imágenes ya construidas de este commit
#   apps/api/deploy/deploy.sh migrate    # construye y aplica las migraciones pendientes, sin desplegar
#   apps/api/deploy/deploy.sh secrets    # sube apps/api/.env.cloudrun como nueva versión del secreto y redespliega
#   apps/api/deploy/deploy.sh seed       # ejecuta los seeds (catálogo, IAM, agentes) contra la BBDD de producción
#
# Las migraciones (`prisma migrate deploy`) corren en el job de Cloud Run
# `brio-api-migrate` justo antes de desplegar: si fallan, el despliegue se
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
MIGRATE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/api-migrate:${TAG}"
# Caché entre despliegues de Cloud Build (ver cloudbuild.yaml).
CACHE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/api-migrate:cache"
MIGRATIONS="apps/api/prisma/migrations"
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
    --config "$API/deploy/cloudbuild.yaml" --substitutions "_IMAGE=$IMAGE,_MIGRATE_IMAGE=$MIGRATE_IMAGE,_CACHE_IMAGE=$CACHE_IMAGE"
}

# Aplica las migraciones pendientes con la imagen de migraciones de este commit.
# Si el job ya existe (lo gestiona Terraform) solo se cambia la imagen; la
# primera vez se crea con toda su configuración.
migrate() {
  if "${G[@]}" run jobs describe "${SERVICE}-migrate" --region "$REGION" >/dev/null 2>&1; then
    "${G[@]}" run jobs update "${SERVICE}-migrate" --region "$REGION" --image "$MIGRATE_IMAGE"
  else
    "${G[@]}" run jobs deploy "${SERVICE}-migrate" --region "$REGION" --image "$MIGRATE_IMAGE" \
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
    "${G[@]}" run jobs update "${SERVICE}-migrate" --region "$REGION" --image "$MIGRATE_IMAGE"
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
  all) ensure_base; push_secret; build; migrate; deploy "$IMAGE" ;;
  ci) build; migrate_if_needed; deploy "$IMAGE" ;;
  build) build ;;
  release) migrate_if_needed; deploy "$IMAGE" ;;
  migrate) build; migrate ;;
  *) echo "Uso: $0 [all|ci|build|release|migrate|secrets|seed]"; exit 1 ;;
esac
