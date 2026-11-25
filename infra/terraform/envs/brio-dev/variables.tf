variable "gcp_project" {
  type = string
}

variable "gcp_region" {
  type = string
}

variable "service_name" {
  description = "Servicio de Cloud Run de la API."
  type        = string
}

variable "github_repository" {
  type = string
}

variable "github_branch" {
  description = "Rama desde la que GitHub Actions puede desplegar."
  type        = string
}

variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_zone_name" {
  description = "Dominio (zona) en Cloudflare, p. ej. example.com."
  type        = string
}

variable "api_hostname" {
  description = "Hostname público de la API, p. ej. api.brio.example.com."
  type        = string
}

variable "storage_bucket" {
  description = "Bucket de R2 con las fotos y archivos."
  type        = string
}

variable "enforce_edge_origin" {
  description = <<-EOT
    true = la API rechaza (403) lo que no llegue a través de Cloudflare.
    Actívalo SOLO cuando la app móvil y el resto de clientes usen ya
    api_hostname en vez de la URL *.run.app.
  EOT
  type        = bool
  default     = false
}

variable "blocked_countries" {
  type    = list(string)
  default = []
}
