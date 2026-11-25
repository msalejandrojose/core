#!/usr/bin/env bash
# Configura (una vez) el despliegue de la API desde GitHub Actions sin claves:
# Workload Identity Federation para que el workflow `Deploy Brío API` actúe
# como la cuenta de servicio `github-deploy`, y los secretos del repo que usa.
#
#   apps/api/deploy/setup-github-deploy.sh
#
# Requiere gcloud (con permisos de owner en el proyecto) y gh con sesión.
# Es idempotente: se puede volver a ejecutar sin romper nada.
set -euo pipefail

PROJECT="${PROJECT:-core-502518}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-brio-api}"
GH_REPO="${GH_REPO:-msalejandrojose/core}"
GH_BRANCH="${GH_BRANCH:-brio-dev}"
POOL="github"
PROVIDER="github-oidc"
DEPLOYER="github-deploy"
DEPLOYER_SA="${DEPLOYER}@${PROJECT}.iam.gserviceaccount.com"
RUNTIME_SA="${SERVICE}@${PROJECT}.iam.gserviceaccount.com"
G=(gcloud --project "$PROJECT" --quiet)

NUMBER="$("${G[@]}" projects describe "$PROJECT" --format 'value(projectNumber)')"
BUILD_SA="${NUMBER}-compute@developer.gserviceaccount.com"

"${G[@]}" services enable iamcredentials.googleapis.com sts.googleapis.com \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Cuenta de servicio con la que despliega GitHub Actions.
"${G[@]}" iam service-accounts describe "$DEPLOYER_SA" >/dev/null 2>&1 ||
  "${G[@]}" iam service-accounts create "$DEPLOYER" --display-name "Despliegue desde GitHub Actions"

# Lo justo para: subir el código a Cloud Build y seguir el log, desplegar el
# servicio y el job de migraciones, y hacerlos correr como brio-api.
# `storage.bucketViewer` en el proyecto: `gcloud builds submit` lista los
# buckets para comprobar que el suyo (PROJECT_cloudbuild) es de este proyecto;
# sin ello falla con «forbidden from accessing the bucket».
for role in roles/run.admin roles/cloudbuild.builds.editor roles/logging.viewer roles/serviceusage.serviceUsageConsumer roles/storage.bucketViewer; do
  "${G[@]}" projects add-iam-policy-binding "$PROJECT" \
    --member "serviceAccount:$DEPLOYER_SA" --role "$role" --condition None >/dev/null
done
"${G[@]}" storage buckets add-iam-policy-binding "gs://${PROJECT}_cloudbuild" \
  --member "serviceAccount:$DEPLOYER_SA" --role roles/storage.admin >/dev/null
for sa in "$RUNTIME_SA" "$BUILD_SA"; do
  "${G[@]}" iam service-accounts add-iam-policy-binding "$sa" \
    --member "serviceAccount:$DEPLOYER_SA" --role roles/iam.serviceAccountUser >/dev/null
done

# Workload Identity Federation: solo este repo y solo la rama del proyecto.
"${G[@]}" iam workload-identity-pools describe "$POOL" --location global >/dev/null 2>&1 ||
  "${G[@]}" iam workload-identity-pools create "$POOL" --location global --display-name "GitHub Actions"
"${G[@]}" iam workload-identity-pools providers describe "$PROVIDER" \
  --workload-identity-pool "$POOL" --location global >/dev/null 2>&1 ||
  "${G[@]}" iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --workload-identity-pool "$POOL" --location global \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository=='${GH_REPO}' && assertion.ref=='refs/heads/${GH_BRANCH}'"
"${G[@]}" iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GH_REPO}" >/dev/null

# Secretos del repo que lee el workflow.
gh secret set GCP_WIF_PROVIDER --repo "$GH_REPO" \
  --body "projects/${NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
gh secret set GCP_DEPLOY_SA --repo "$GH_REPO" --body "$DEPLOYER_SA"

echo "✔ Listo: el próximo push a ${GH_BRANCH} que toque la API se desplegará con sus migraciones."
