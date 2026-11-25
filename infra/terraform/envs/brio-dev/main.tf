# Stack de Brío (entorno dev):
#   Cloud Run (API NestJS) + TiDB (fuera de Terraform) + Cloudflare delante
#   (Worker proxy + WAF + rate limiting, plan gratuito) + R2 (fotos).

locals {
  # Única fuente de las variables NO secretas: el mismo YAML de siempre.
  api_env = {
    for k, v in yamldecode(file("${path.module}/../../../../apps/api/deploy/cloudrun.env.yaml")) :
    k => tostring(v)
  }
}

# Secreto compartido Worker ↔ API (cabecera x-origin-auth).
resource "random_password" "edge_origin" {
  length  = 48
  special = false
}

module "api" {
  source = "../../modules/cloud-run-api"

  project             = var.gcp_project
  region              = var.gcp_region
  service_name        = var.service_name
  artifact_repository = "brio"
  env_secret_name     = "${var.service_name}-env"

  env_vars = merge(local.api_env, {
    EDGE_ORIGIN_ENFORCE = tostring(var.enforce_edge_origin)
  })

  secret_env_var_names = ["EDGE_ORIGIN_SECRET"]
  secret_env_vars = {
    EDGE_ORIGIN_SECRET = random_password.edge_origin.result
  }

  cpu           = "1"
  memory        = "512Mi"
  min_instances = 0
  max_instances = 1
  concurrency   = 40

  github_deploy = {
    repository = var.github_repository
    branch     = var.github_branch
  }
}

module "edge" {
  source = "../../modules/cloudflare-edge"

  account_id         = var.cloudflare_account_id
  zone_name          = var.cloudflare_zone_name
  api_hostname       = var.api_hostname
  worker_name        = "${var.service_name}-edge"
  origin_host        = module.api.service_host
  origin_auth_secret = random_password.edge_origin.result
  blocked_countries  = var.blocked_countries
}

# Fotos y archivos (privado: la API firma el acceso). Ya existe: ver imports.tf.
resource "cloudflare_r2_bucket" "storage" {
  account_id = var.cloudflare_account_id
  name       = var.storage_bucket

  lifecycle {
    prevent_destroy = true
    # La ubicación solo cuenta al crear; que un cambio nunca recree el bucket.
    ignore_changes = [location, storage_class]
  }
}
