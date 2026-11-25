# Cloudflare delante de la API en Cloud Run, todo en plan gratuito:
#   Worker (proxy) + dominio propio + WAF (reglas propias + Free Managed
#   Ruleset) + 1 regla de rate limiting + ajustes TLS de la zona.

data "cloudflare_zone" "this" {
  filter = {
    name = var.zone_name
  }
}

locals {
  zone_id   = data.cloudflare_zone.this.zone_id
  host_expr = "http.host eq \"${var.api_hostname}\""
  script    = file("${path.module}/worker/proxy.js")
}

# --- Worker proxy ------------------------------------------------------------

resource "cloudflare_workers_script" "proxy" {
  account_id         = var.account_id
  script_name        = var.worker_name
  content            = local.script
  main_module        = "proxy.js"
  compatibility_date = "2025-09-01"

  bindings = [
    {
      name = "ORIGIN_HOST"
      type = "plain_text"
      text = var.origin_host
    },
    {
      name = "ORIGIN_AUTH_SECRET"
      type = "secret_text"
      text = var.origin_auth_secret
    },
  ]

  # Se declaran todos los valores que Cloudflare pone por defecto: con solo
  # `enabled`, el provider ve diferencias en cada plan e intenta quitarlos.
  observability = {
    enabled            = true
    head_sampling_rate = 1
    logs = {
      enabled            = true
      head_sampling_rate = 1
      invocation_logs    = true
      persist            = true
    }
    traces = {
      enabled            = false
      head_sampling_rate = 1
      persist            = true
    }
  }
}

# Dominio propio: crea el registro DNS y el certificado automáticamente.
resource "cloudflare_workers_custom_domain" "api" {
  account_id = var.account_id
  zone_id    = local.zone_id
  hostname   = var.api_hostname
  service    = cloudflare_workers_script.proxy.script_name
}

# --- Ajustes de la zona --------------------------------------------------------

resource "cloudflare_zone_setting" "this" {
  for_each = var.zone_settings

  zone_id    = local.zone_id
  setting_id = each.key
  value      = each.value
}

# --- WAF: reglas propias (plan gratuito: hasta 5) ---------------------------------
# Solo afectan al hostname de la API. Ojo: es el ruleset de entrada de la fase
# para TODA la zona; si ya tienes reglas propias creadas a mano, impórtalo antes.

resource "cloudflare_ruleset" "waf_custom" {
  zone_id     = local.zone_id
  name        = "Reglas WAF propias"
  description = "Gestionado por Terraform (infra/terraform)"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules = concat(
    [
      {
        ref         = "api_block_scanners"
        description = "API: bloquea rutas típicas de escáneres (WordPress, PHP, .env, .git)"
        action      = "block"
        enabled     = true
        expression  = "(${local.host_expr} and (http.request.uri.path contains \"/wp-\" or http.request.uri.path contains \".php\" or http.request.uri.path contains \"/.env\" or http.request.uri.path contains \"/.git\" or http.request.uri.path contains \"phpmyadmin\" or http.request.uri.path contains \"/cgi-bin\"))"
      },
      {
        ref         = "api_block_methods"
        description = "API: bloquea métodos HTTP que la API no usa"
        action      = "block"
        enabled     = true
        expression  = "(${local.host_expr} and not http.request.method in {\"GET\" \"HEAD\" \"POST\" \"PUT\" \"PATCH\" \"DELETE\" \"OPTIONS\"})"
      },
    ],
    length(var.blocked_countries) == 0 ? [] : [
      {
        ref         = "api_block_countries"
        description = "API: bloquea países"
        action      = "block"
        enabled     = true
        expression  = "(${local.host_expr} and ip.src.country in {${join(" ", [for c in var.blocked_countries : "\"${c}\""])}})"
      },
    ],
  )
}

# --- Rate limiting (plan gratuito: 1 regla, periodo y bloqueo de 10 s) -----------

resource "cloudflare_ruleset" "rate_limit" {
  zone_id     = local.zone_id
  name        = "Rate limiting"
  description = "Gestionado por Terraform (infra/terraform)"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [
    {
      ref         = "api_auth_rate_limit"
      description = "API: limita login/registro/reset/tokens por IP"
      action      = "block"
      enabled     = true
      expression  = "(http.request.uri.path in {${join(" ", [for p in var.rate_limited_paths : "\"${p}\""])}})"
      ratelimit = {
        characteristics     = ["cf.colo.id", "ip.src"]
        period              = 10
        requests_per_period = var.rate_limit_requests_per_10s
        mitigation_timeout  = 10
      }
    },
  ]
}

# --- Free Managed Ruleset (opcional: ya viene activo en el plan gratuito) ---------

resource "cloudflare_ruleset" "waf_managed" {
  count = var.manage_free_managed_ruleset ? 1 : 0

  zone_id     = local.zone_id
  name        = "Reglas gestionadas"
  description = "Gestionado por Terraform (infra/terraform)"
  kind        = "zone"
  phase       = "http_request_firewall_managed"

  rules = [
    {
      ref         = "free_managed_ruleset"
      description = "Cloudflare Free Managed Ruleset"
      action      = "execute"
      enabled     = true
      expression  = "true"
      action_parameters = {
        id = "77454fe2d30c4220b5701f6fdfb893ba"
      }
    },
  ]
}
