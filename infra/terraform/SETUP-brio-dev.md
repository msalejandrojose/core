# Puesta en marcha: Cloudflare (CDN + WAF) + Terraform para Brío (brio-dev)

Checklist para hacer desde el ordenador (navegador + terminal). Contexto y
detalles técnicos en [`README.md`](./README.md).

- **Rama:** `claude/cloudflare-workers-terraform-stack-ijkgi2` (⚠️ **no mergear todavía**)
- **Dominio de pruebas:** `ajly.online` (Hostinger, 1 año)
- **URL nueva de la API:** `https://brio-api.ajly.online`
- **Coste:** solo el dominio. Cloudflare Free, Worker gratis (100.000 peticiones/día), R2 gratis.

```bash
git fetch origin claude/cloudflare-workers-terraform-stack-ijkgi2
git checkout claude/cloudflare-workers-terraform-stack-ijkgi2
```

---

## 1. Dominio (navegador)

### 1.1 Hostinger: quitar la renovación automática
- [ ] hPanel → **Dominios** → `ajly.online` → desactivar **Renovación automática**.
  (Si no aparece: **Facturación → Suscripciones → ajly.online**.)
  La renovación de `.online` es cara; es un dominio de pruebas.

### 1.2 Cloudflare: añadir el dominio
- [ ] [dash.cloudflare.com](https://dash.cloudflare.com) → **Añadir un dominio** → `ajly.online`
      → dejar marcada la importación automática de DNS → **Continuar**.
- [ ] Plan **Free** (abajo del todo).
- [ ] Copiar los **dos nameservers** que muestra (`xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`).

### 1.3 Hostinger: poner los nameservers de Cloudflare
- [ ] hPanel → **Dominios** → `ajly.online` → **DNS / Nameservers** → **Cambiar nameservers**
      → *Usar nameservers personalizados* → pegar los dos → **Guardar**.
- [ ] En Cloudflare: **Comprobar nameservers**. Esperar a que el dominio salga como
      **Activo** (minutos; como mucho 24 h, llega un correo).

### 1.4 Apuntar el Account ID
- [ ] Cloudflare → `ajly.online` → **Información general** → columna derecha → **API** → **Account ID**.
- [ ] Ponerlo en `infra/terraform/envs/brio-dev/terraform.tfvars` → `cloudflare_account_id`
      y en `backend.hcl` (paso 2.3). No es secreto.

---

## 2. Credenciales y estado de Terraform

> Ningún token va a git ni al chat: solo a variables de entorno de la terminal.

### 2.1 Bucket del estado (R2)
- [ ] Cloudflare → **R2** → **Crear bucket** → nombre `core-tfstate` (privado).
      (O por terminal: `pnpm exec wrangler r2 bucket create core-tfstate`.)
- [ ] R2 → **Administrar tokens de API de R2** → **Crear token** → permiso
      *Lectura y escritura de objetos*, solo bucket `core-tfstate`.
      Guardar **Access Key ID** y **Secret Access Key**.

### 2.2 Token de API de Cloudflare (para Terraform)
- [ ] Perfil → **Tokens de API** → **Crear token** → **Token personalizado** con:

  | Ámbito | Permiso | Nivel |
  |---|---|---|
  | Cuenta | Workers Scripts | Editar |
  | Cuenta | Workers R2 Storage | Editar |
  | Zona | Zone | Leer |
  | Zona | Zone Settings | Editar |
  | Zona | Zone WAF | Editar |
  | Zona | Workers Routes | Editar |
  | Zona | DNS | Editar |
  | Zona | SSL and Certificates | Editar |

  Recursos de zona: solo `ajly.online`. Recursos de cuenta: tu cuenta.

### 2.3 Backend
- [ ] `cd infra/terraform/envs/brio-dev && cp backend.hcl.example backend.hcl`
- [ ] En `backend.hcl`, sustituir `REEMPLAZAR_CLOUDFLARE_ACCOUNT_ID` por el Account ID
      (`backend.hcl` está en `.gitignore`).

### 2.4 Google Cloud
- [ ] `gcloud auth application-default login` (cuenta con permisos de owner en `core-502518`).

---

## 3. Terraform

Requiere Terraform ≥ 1.10.

```bash
cd infra/terraform/envs/brio-dev

export CLOUDFLARE_API_TOKEN=...          # token del paso 2.2
export AWS_ACCESS_KEY_ID=...             # R2, paso 2.1
export AWS_SECRET_ACCESS_KEY=...         # R2, paso 2.1

terraform init -backend-config=backend.hcl
terraform plan
```

- [ ] Revisar el `plan`:
  - Lo que ya existe sale como **import** (Cloud Run `brio-api`, job `brio-api-migrate`,
    secreto `brio-api-env`, Artifact Registry `brio`, cuentas de servicio, WIF, bucket `brio-fotos`).
    **Nada de eso debe salir como destroy/replace.**
  - Se crea: Worker `brio-api-edge`, dominio `brio-api.ajly.online`, reglas WAF,
    regla de rate limiting, ajustes TLS, secreto `brio-api-edge-origin-secret`.
  - `brio-api` sale con cambios (nueva variable `EDGE_ORIGIN_SECRET`): crea una
    revisión nueva **con la misma imagen**.
  - Si falla al crear `waf_custom` o `rate_limit` porque ya existen reglas en la zona:
    `terraform import module.edge.cloudflare_ruleset.<waf_custom|rate_limit> zones/<zone_id>/<ruleset_id>`.
- [ ] `terraform apply`
- [ ] Commitear el `.terraform.lock.hcl` que genera `init` (en la misma rama).

---

## 4. Comprobar

```bash
curl -i https://brio-api.ajly.online/health        # 200, con cabecera cf-ray (pasa por Cloudflare)
curl -i https://brio-api.ajly.online/.env          # 403 (bloqueado por el WAF)
```

- [ ] Las dos respuestas son las esperadas.
- [ ] Cloudflare → `ajly.online` → **Seguridad → Eventos**: aparece el bloqueo de `/.env`.

---

## 5. Pasar la app a la URL nueva (cuando lo anterior vaya bien)

- [ ] `apps/mobile/.env.production` → `VITE_API_URL=https://brio-api.ajly.online`
- [ ] `apps/api/deploy/cloudrun.env.yaml` → `APP_URL: https://brio-api.ajly.online`
      (y `OAUTH_ISSUER_URL` si se usa MCP/OAuth) → `terraform apply`.
- [ ] Cuando ningún cliente use ya `*.run.app`: `enforce_edge_origin = true` en
      `terraform.tfvars` → `terraform apply`. A partir de ahí, la URL directa
      de Cloud Run responde 403 (salvo `/health`).

---

## Notas

- **Cambio de flujo de despliegue:** `deploy.sh` (GitHub Actions) ya solo cambia la
  imagen. Las variables de `cloudrun.env.yaml`, CPU, memoria y escalado se aplican
  con `terraform apply`.
- **Dominio definitivo:** cambiar `cloudflare_zone_name` y `api_hostname` en
  `terraform.tfvars` y `terraform apply`. El hostname de la API debe colgar
  directamente de la zona (`brio-api.<dominio>`), no `api.brio.<dominio>`.
