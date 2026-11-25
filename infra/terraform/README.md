# Infraestructura como código (Terraform)

El stack de cada proyecto declarado en Terraform. De momento, **Brío (`brio-dev`)**.

```
infra/terraform/
├── modules/
│   ├── cloud-run-api/      # API en Cloud Run + Secret Manager + Artifact Registry + despliegue desde GitHub (WIF)
│   └── cloudflare-edge/    # Cloudflare delante de la API: Worker proxy + dominio + WAF + rate limiting
└── envs/
    └── brio-dev/           # composición del entorno (+ bucket R2 de fotos)
```

Para otro proyecto/entorno: copia `envs/brio-dev` a `envs/<proyecto>-<entorno>`,
cambia `terraform.tfvars` y la `key` de `backend.hcl`. Los módulos se reutilizan tal cual.

## Arquitectura (brio-dev)

```
App / web ──https──▶ Cloudflare (zona)                         ──▶ Cloud Run brio-api ──▶ TiDB
                     ├─ WAF: Free Managed Ruleset + reglas propias        │
                     ├─ Rate limiting (login/registro/tokens)             └──▶ R2 brio-fotos
                     └─ Worker brio-api-edge (proxy) ── x-origin-auth ──▶
```

| Pieza | Dónde | Coste |
|---|---|---|
| API | Cloud Run `brio-api` (`europe-west1`), escala a 0 | Gratis (capa gratuita) |
| BBDD | TiDB Cloud Starter (fuera de Terraform) | Gratis |
| CDN + WAF + rate limiting | Cloudflare, plan Free | Gratis |
| Proxy | Worker `brio-api-edge` | Gratis hasta 100.000 peticiones/día |
| Fotos | R2 `brio-fotos` | Gratis hasta 10 GB |
| Estado de Terraform | R2 `core-tfstate` | Gratis |

### Por qué un Worker y no un simple CNAME

Cloud Run enruta por la cabecera `Host` (`*.run.app`). Con un CNAME proxied de
Cloudflare llegaría `Host: api.tudominio`, y reescribir el Host con Origin Rules
es solo del plan Enterprise. El Worker reenvía a `*.run.app` y además añade:

- `x-origin-auth`: secreto compartido (lo genera Terraform). La API lo valida en
  `apps/api/src/infrastructure/edge/edge-origin.middleware.ts`.
- `x-edge-client-ip`: IP real del cliente. Sin esto el rate limiter de la API
  vería la IP de Cloudflare y todos los usuarios compartirían contador.

Con `enforce_edge_origin = true` la API responde 403 a quien llame directo a
`*.run.app` saltándose el WAF (los `/health` siguen abiertos).

### Qué protege el WAF (plan Free)

- **Free Managed Ruleset**: activo por defecto en el plan gratuito (vulnerabilidades
  de alto impacto). `manage_free_managed_ruleset = true` en el módulo para declararlo.
- **Reglas propias** (máx. 5 en Free), solo para el host de la API: rutas de
  escáneres (`/wp-`, `.php`, `/.env`, `/.git`…), métodos HTTP no usados y,
  opcionalmente, países (`blocked_countries`).
- **Rate limiting** (1 regla en Free, ventana y bloqueo de 10 s): 10 peticiones
  por IP cada 10 s a login, registro, reset de contraseña y `/v1/oauth/token`.
- No se usan challenges/Browser Integrity Check: la app nativa, los webhooks
  (SendGrid, WhatsApp) y los clientes MCP no son navegadores.

Una API dinámica apenas aprovecha la caché de la CDN; lo que se gana es WAF,
protección DDoS, TLS en el borde y poder cerrar el acceso directo al origen.

## Quién gestiona qué

| | Terraform | `deploy.sh` (GitHub Actions) |
|---|---|---|
| CPU, memoria, escalado, variables, secretos montados | ✅ | — |
| Imagen del servicio y del job de migraciones | — (la ignora) | ✅ |
| Valores del `.env` secreto (`brio-api-env`) | — (solo el contenedor) | ✅ `deploy.sh secrets` |
| Worker, dominio, WAF, rate limiting, R2 | ✅ | — |

⚠️ Las variables NO secretas siguen en `apps/api/deploy/cloudrun.env.yaml`, pero
ahora se aplican con `terraform apply`, no en cada push: `deploy.sh` solo
cambia la imagen (un `gcloud run deploy` completo borraría las variables que
añade Terraform, como `EDGE_ORIGIN_SECRET`).

## Puesta en marcha (una vez)

Requisitos: Terraform ≥ 1.10, `gcloud` con sesión (`gcloud auth application-default login`), `wrangler`.

1. **Dominio en Cloudflare**: la zona (`cloudflare_zone_name`) debe estar en la
   cuenta con los DNS apuntando a Cloudflare.
2. **Bucket del estado**:
   ```bash
   pnpm exec wrangler r2 bucket create core-tfstate
   ```
   y un token de API de R2 (*Object Read & Write* sobre `core-tfstate`).
3. **Token de API de Cloudflare** con: *Account › Workers Scripts: Edit*,
   *Account › Workers R2 Storage: Edit*, *Zone › Zone Settings: Edit*,
   *Zone › Zone WAF: Edit*, *Zone › Workers Routes: Edit*, *Zone › DNS: Edit*,
   *Zone › Zone: Read*.
4. **Rellenar** `envs/brio-dev/terraform.tfvars` (cuenta, zona, `api_hostname`)
   y `backend.hcl` (desde `backend.hcl.example`).
5. **Aplicar**:
   ```bash
   cd infra/terraform/envs/brio-dev
   export CLOUDFLARE_API_TOKEN=...                 # token del paso 3
   export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...   # token R2 del paso 2
   terraform init -backend-config=backend.hcl
   terraform plan    # revisa: los recursos existentes salen como "import"
   terraform apply
   ```
   Commitea el `.terraform.lock.hcl` que genera `init`.

   El primer `apply` importa lo que ya existe (ver `imports.tf`) y crea una
   revisión nueva de Cloud Run con la misma imagen (añade `EDGE_ORIGIN_SECRET`).
   Si la zona ya tenía reglas WAF propias o de rate limiting creadas a mano,
   el `apply` fallará al crear esos rulesets: impórtalos antes
   (`terraform import module.edge.cloudflare_ruleset.waf_custom zones/<zone_id>/<ruleset_id>`).

## Pasar el tráfico por Cloudflare

1. `terraform apply` y comprobar `curl https://<api_hostname>/health`.
2. Apuntar los clientes a la URL nueva (`terraform output api_url`):
   - `apps/mobile/.env.production` → `VITE_API_URL`
   - `apps/api/deploy/cloudrun.env.yaml` → `APP_URL` (y `OAUTH_ISSUER_URL` si se usa MCP/OAuth)
3. Cuando ya no quede ningún cliente usando `*.run.app`:
   `enforce_edge_origin = true` en `terraform.tfvars` y `terraform apply`.
