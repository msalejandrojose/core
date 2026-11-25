output "api_url" {
  description = "URL pública (Cloudflare). Es la que deben usar la app móvil y el resto de clientes."
  value       = module.edge.api_url
}

output "cloud_run_url" {
  description = "URL directa de Cloud Run (*.run.app)."
  value       = module.api.service_url
}

output "github_wif_provider" {
  description = "Secreto GCP_WIF_PROVIDER del repo."
  value       = module.api.github_wif_provider
}

output "github_deploy_service_account" {
  description = "Secreto GCP_DEPLOY_SA del repo."
  value       = module.api.github_deploy_service_account
}
