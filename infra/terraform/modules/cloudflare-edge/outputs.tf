output "zone_id" {
  value = local.zone_id
}

output "api_url" {
  description = "URL pública de la API detrás de Cloudflare."
  value       = "https://${cloudflare_workers_custom_domain.api.hostname}"
}

output "worker_name" {
  value = cloudflare_workers_script.proxy.script_name
}
