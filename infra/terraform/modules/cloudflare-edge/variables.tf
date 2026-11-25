variable "account_id" {
  description = "ID de la cuenta de Cloudflare."
  type        = string
}

variable "zone_name" {
  description = "Zona (dominio) de Cloudflare donde vive la API, p. ej. example.com."
  type        = string
}

variable "api_hostname" {
  description = "Hostname público de la API dentro de la zona, p. ej. brio-api.example.com (un solo nivel: Universal SSL no cubre sub-subdominios)."
  type        = string
}

variable "worker_name" {
  description = "Nombre del Worker que hace de proxy hacia Cloud Run."
  type        = string
}

variable "origin_host" {
  description = "Host de Cloud Run al que se reenvía el tráfico (sin https://), p. ej. brio-api-123.europe-west1.run.app."
  type        = string
}

variable "origin_auth_secret" {
  description = "Secreto compartido que el Worker envía en x-origin-auth y la API valida."
  type        = string
  sensitive   = true
}

variable "zone_settings" {
  description = <<-EOT
    Ajustes de la zona que gestiona Terraform. OJO: afectan a TODA la zona
    (también a la web u otros subdominios), no solo a la API.
  EOT
  type        = map(string)
  default = {
    always_use_https = "on"
    min_tls_version  = "1.2"
    tls_1_3          = "on"
  }
}

variable "blocked_countries" {
  description = "Códigos ISO de país a bloquear en la API (vacío = ninguno)."
  type        = list(string)
  default     = []
}

variable "rate_limited_paths" {
  description = <<-EOT
    Rutas exactas protegidas por la única regla de rate limiting del plan
    gratuito (login, registro, reset de contraseña, tokens OAuth).
  EOT
  type        = list(string)
  default = [
    "/v1/auth/login",
    "/v1/auth/register",
    "/v1/auth/request-password-reset",
    "/v1/auth/reset-password",
    "/v1/oauth/token",
  ]
}

variable "rate_limit_requests_per_10s" {
  description = "Peticiones por IP cada 10 s a esas rutas antes de bloquear 10 s."
  type        = number
  default     = 10
}

variable "manage_free_managed_ruleset" {
  description = <<-EOT
    Gestionar con Terraform el "Cloudflare Free Managed Ruleset". En el plan
    gratuito ya viene activo por defecto; actívalo solo si quieres que quede
    declarado (si la zona ya tiene ese ruleset de entrada, hay que importarlo).
  EOT
  type        = bool
  default     = false
}
