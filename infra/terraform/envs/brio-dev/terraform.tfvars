# Valores NO secretos del entorno brio-dev. Los tokens van por variables de
# entorno (CLOUDFLARE_API_TOKEN, credenciales de gcloud), nunca aquí.

gcp_project  = "core-502518"
gcp_region   = "europe-west1"
service_name = "brio-api"

github_repository = "msalejandrojose/core"
github_branch     = "brio-dev"

storage_bucket = "brio-fotos"

# TODO: rellenar con la cuenta y el dominio de Cloudflare.
cloudflare_account_id = "REEMPLAZAR_CLOUDFLARE_ACCOUNT_ID"
cloudflare_zone_name  = "REEMPLAZAR.example"
api_hostname          = "api.brio.REEMPLAZAR.example"

# Pasar a true cuando la app use ya api_hostname (ver README).
enforce_edge_origin = false
