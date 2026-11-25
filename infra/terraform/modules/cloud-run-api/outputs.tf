output "service_url" {
  description = "URL *.run.app del servicio."
  value       = google_cloud_run_v2_service.api.uri
}

output "service_host" {
  description = "Host *.run.app (sin esquema), para el proxy de Cloudflare."
  value       = trimprefix(google_cloud_run_v2_service.api.uri, "https://")
}

output "runtime_service_account" {
  value = google_service_account.runtime.email
}

output "github_wif_provider" {
  description = "Valor del secreto GCP_WIF_PROVIDER del repo."
  value       = var.github_deploy == null ? null : google_iam_workload_identity_pool_provider.github["this"].name
}

output "github_deploy_service_account" {
  description = "Valor del secreto GCP_DEPLOY_SA del repo."
  value       = var.github_deploy == null ? null : google_service_account.deployer["this"].email
}
