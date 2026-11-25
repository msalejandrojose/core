# Recursos que ya existen (los crearon deploy.sh y setup-github-deploy.sh, o
# se hicieron a mano en Cloudflare). Terraform los adopta en el primer
# `terraform apply` en vez de intentar crearlos. Una vez importados, estos
# bloques no hacen nada y se pueden borrar.

import {
  to = module.api.google_artifact_registry_repository.images
  id = "projects/${var.gcp_project}/locations/${var.gcp_region}/repositories/brio"
}

import {
  to = module.api.google_service_account.runtime
  id = "projects/${var.gcp_project}/serviceAccounts/${var.service_name}@${var.gcp_project}.iam.gserviceaccount.com"
}

import {
  to = module.api.google_secret_manager_secret.env
  id = "projects/${var.gcp_project}/secrets/${var.service_name}-env"
}

import {
  to = module.api.google_cloud_run_v2_service.api
  id = "projects/${var.gcp_project}/locations/${var.gcp_region}/services/${var.service_name}"
}

import {
  to = module.api.google_cloud_run_v2_job.migrate
  id = "projects/${var.gcp_project}/locations/${var.gcp_region}/jobs/${var.service_name}-migrate"
}

import {
  to = module.api.google_service_account.deployer["this"]
  id = "projects/${var.gcp_project}/serviceAccounts/github-deploy@${var.gcp_project}.iam.gserviceaccount.com"
}

import {
  to = module.api.google_iam_workload_identity_pool.github["this"]
  id = "projects/${var.gcp_project}/locations/global/workloadIdentityPools/github"
}

import {
  to = module.api.google_iam_workload_identity_pool_provider.github["this"]
  id = "projects/${var.gcp_project}/locations/global/workloadIdentityPools/github/providers/github-oidc"
}

import {
  to = cloudflare_r2_bucket.storage
  id = "${var.cloudflare_account_id}/${var.storage_bucket}/default"
}
