# Despliegue de la API (Brío) en Cloud Run

| Pieza | Dónde | Plan |
|---|---|---|
| API | Cloud Run `brio-api`, proyecto `core-502518`, `europe-west1` | Gratuito (2 M peticiones/mes); escala a 0, máx. 1 instancia |
| Base de datos | TiDB Cloud Starter `brio` (MySQL compatible), AWS Frankfurt | Gratuito (5 GiB), límite de gasto 0 $ |
| Fotos y archivos | Cloudflare R2, bucket privado `brio-fotos` | Gratuito (10 GB/mes) |
| Secretos | Secret Manager `brio-api-env` (un único `.env`) | Gratuito |

## Terraform y Cloudflare

La infraestructura de este despliegue está declarada en
[`infra/terraform/envs/brio-dev`](../../../infra/terraform/README.md): el servicio,
el job de migraciones, los secretos, Artifact Registry, el acceso de GitHub
Actions (WIF) y, delante, Cloudflare (Worker proxy + WAF + rate limiting) y el
bucket R2. Desde entonces `deploy.sh` solo cambia la **imagen** del servicio y
del job; CPU, escalado y variables (incluidas las de `cloudrun.env.yaml`) se
aplican con `terraform apply`.

## Variables de entorno

- **No secretas**: `deploy/cloudrun.env.yaml` (en git). Se aplican en cada despliegue.
- **Secretas**: `apps/api/.env.cloudrun` (NO se commitea: está en `.gitignore`,
  `.dockerignore` y `.gcloudignore`). Se sube como versión del secreto
  `brio-api-env` y Cloud Run lo monta en `/secrets/.env`; la API lo carga
  porque `ENV_FILE=/secrets/.env` (ver `app.module.ts`).
  Claves: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`,
  `DATABASE_URL` (solo para la CLI de Prisma), `JWT_SECRET`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_OAUTH_*`, `OPENAI_API_KEY`, `STORAGE_S3_ACCESS_KEY_ID`,
  `STORAGE_S3_SECRET_ACCESS_KEY`, `STORAGE_S3_ENDPOINT`, `SEED_ADMIN_*`.

## Comandos

```bash
apps/api/deploy/deploy.sh            # construye la imagen (Cloud Build) y despliega
apps/api/deploy/deploy.sh secrets    # tras editar .env.cloudrun: nueva versión del secreto y redespliegue
apps/api/deploy/deploy.sh seed       # seeds (IAM, secciones, catálogo de Brío, agentes) como Cloud Run Job
```

## Migraciones (TiDB)

TiDB no admite algunas sentencias del historial (p. ej. `DROP PRIMARY KEY` y
`ADD PRIMARY KEY` en el mismo `ALTER`), así que la base de datos se creó con el
esquema final (`prisma migrate diff --from-empty`) y el historial se marcó como
aplicado (`prisma migrate resolve --applied`). Las migraciones nuevas se aplican
solas en cada despliegue (TASK-434): `deploy.sh` ejecuta el job de Cloud Run
`brio-api-migrate` (la misma imagen que el servicio, con el comando
`prisma migrate deploy`) antes de desplegar. Si falla, no se despliega y sigue
la versión anterior. Para migrar sin desplegar: `deploy.sh migrate`. A mano,
desde `apps/api`, sigue valiendo:

```bash
set -a; . ./.env.cloudrun; set +a; npx prisma migrate deploy
```

Si una migración nueva junta varios cambios de esquema en un `ALTER TABLE`, hay
que partirla en varios (TiDB los admite de uno en uno). Además, el clúster
tiene `tidb_enable_clustered_index=OFF` para que las claves primarias se puedan
cambiar como en MySQL.

## Despliegue automático desde GitHub Actions

El workflow `Deploy Brío API` (`.github/workflows/deploy-brio-api.yml`) se lanza
con cada push a `brio-dev` que toque la API, sus paquetes o el lockfile (y a
mano desde la pestaña Actions). A la vez pasa los tests y construye las imágenes
(`deploy.sh build`); si las dos cosas van bien, `deploy.sh release` migra (si
hace falta) y despliega. No sube el secreto: usa la última versión de
`brio-api-env` en Secret Manager (para cambiarlo, `deploy.sh secrets` desde el Mac).

Para que tarde poco:

- **Migraciones solo si hay nuevas**: el job `brio-api-migrate` se ejecuta si
  cambia `apps/api/prisma/migrations/` entre el commit desplegado (la etiqueta
  de la imagen que sirve Cloud Run) y el nuevo; si no se puede saber, se
  ejecuta. Para forzarlo: *Run workflow* con «force_migrate», o
  `FORCE_MIGRATE=1 deploy.sh ci`. El job se apunta a la imagen nueva igualmente.
- **Una sola imagen** (`api:<commit>`) para el servicio y los jobs de
  migraciones y seed. Por eso `prisma` y `dotenv` son dependencias de
  producción, y la imagen lleva `prisma/` y `prisma.config.ts`. El comando del
  job está en Terraform (`modules/cloud-run-api`) y `deploy.sh` pasa el mismo.
- **Base de dependencias aparte** (`api-deps:<huella>`, ~170 MB comprimida):
  Node + dependencias de producción (etapa `deps` del Dockerfile). La huella es
  un hash del lockfile, los `package.json`, `packages/`, `patches/` y el
  Dockerfile (`DEPS_INPUTS` en `deploy.sh`). Si ya existe una base con esa
  huella, no se instala nada; si no, se construye en Cloud Build
  (`cloudbuild-deps.yaml`, ~5 min). Para forzarla: *Run workflow* con
  «force_deps», o `FORCE_DEPS=1`.
- **La imagen de cada despliegue es una capa fina**: el código se compila en el
  runner de GitHub (o en el Mac) y `deploy/Dockerfile.app` lo pone encima de la
  base con un contexto mínimo (`dist/`, `prisma/`, `prisma.config.ts`, ~2 MB
  comprimido). El cliente de Prisma no lleva motor nativo, así que da igual
  dónde se compile; lo nativo (argon2) vive en la base, compilado en Alpine.
- **`docker-compose`** sigue construyendo la imagen completa con
  `apps/api/Dockerfile` (última etapa, `runtime`), sin base aparte.
- **Solo se guarda la imagen desplegada**: tras un despliegue correcto,
  `deploy.sh` borra de Artifact Registry todas las imágenes `api` menos la que
  sirve Cloud Run, todas las `api-deps` menos la base de esa imagen (y las
  `api-migrate` antiguas). Si algo falla antes no se borra
  nada, y las imágenes de builds fallidos se van en el siguiente despliegue
  correcto. Por eso `github-deploy` tiene `repoAdmin` en el repositorio `brio`.
  Volver atrás no es cambiar de revisión en Cloud Run (la imagen anterior ya no
  existe): es revertir el commit en `brio-dev` y dejar que se despliegue.

Se autentica en GCP sin claves (Workload Identity Federation), limitado a este
repo y a la rama `brio-dev`. Se configura una vez con:

```bash
apps/api/deploy/setup-github-deploy.sh
```

que crea la cuenta de servicio `github-deploy` con los permisos justos, el pool
`github` y los secretos del repo `GCP_WIF_PROVIDER` y `GCP_DEPLOY_SA`.
