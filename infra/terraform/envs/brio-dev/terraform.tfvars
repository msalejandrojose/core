# Valores NO secretos del entorno brio-dev. Los tokens van por variables de
# entorno (CLOUDFLARE_API_TOKEN, credenciales de gcloud), nunca aquí.

gcp_project  = "core-502518"
gcp_region   = "europe-west1"
service_name = "brio-api"

github_repository = "msalejandrojose/core"
github_branch     = "brio-dev"

storage_bucket = "brio-fotos"

# Dominio de pruebas (Hostinger, 1 año, sin renovación automática). Para pasar
# al definitivo basta con cambiar estas dos líneas.
cloudflare_zone_name = "ajly.online"
# Un solo nivel bajo la zona: el certificado gratuito de Cloudflare (Universal
# SSL) cubre *.ajly.online pero no *.brio.ajly.online.
api_hostname = "brio-api.ajly.online"

# TODO: dash.cloudflare.com → ajly.online → Información general → API → Account ID.
cloudflare_account_id = "REEMPLAZAR_CLOUDFLARE_ACCOUNT_ID"

# Pasar a true cuando la app use ya api_hostname (ver README).
enforce_edge_origin = false
