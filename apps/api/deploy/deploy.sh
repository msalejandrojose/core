#!/usr/bin/env bash
# Despliega la API de Brío en Cloud Run.
#
#   apps/api/deploy/deploy.sh            # construye la imagen y despliega
#   apps/api/deploy/deploy.sh secrets    # sube apps/api/.env.cloudrun como nueva versión del secreto y redespliega
#   apps/api/deploy/deploy.sh seed       # ejecuta los seeds (catálogo, IAM, agentes) contra la BBDD de producción
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
TAG="$(git -C "$ROOT" rev-parse --short HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/api:${TAG}"
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

current_image() {
  "${G[@]}" run services describe "$SERVICE" --region "$REGION" --format 'value(spec.template.spec.containers[0].image)'
}

deploy() {
  local image="$1"
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
    --args=-c,"node dist/seeds/seed-iam.js && node dist/seeds/seed-sections.js && node dist/seeds/seed-brio.js && node dist/seeds/seed-agents.js" \
    --max-retries 0 --task-timeout 900
  "${G[@]}" run jobs execute "${SERVICE}-seed" --region "$REGION" --wait
}

case "${1:-all}" in
  secrets) ensure_base; push_secret; deploy "$(current_image)" ;;
  seed) seed ;;
  all) ensure_base; push_secret; build; deploy "$IMAGE" ;;
  *) echo "Uso: $0 [all|secrets|seed]"; exit 1 ;;
esac
