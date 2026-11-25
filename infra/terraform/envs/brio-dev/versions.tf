terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.29"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 8.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
  }

  # Estado en un bucket privado de R2 (S3 compatible). Los datos de la cuenta
  # van en backend.hcl (ver backend.hcl.example y el README):
  #   terraform init -backend-config=backend.hcl
  backend "s3" {}
}

# Token con permisos de Workers, Zone (DNS, ajustes, WAF) y R2.
# Se lee de la variable de entorno CLOUDFLARE_API_TOKEN.
provider "cloudflare" {}

# Credenciales de `gcloud auth application-default login`.
provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}
