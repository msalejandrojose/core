# Despliegue de la API (Brío) en Cloud Run

| Pieza | Dónde | Plan |
|---|---|---|
| API | Cloud Run `brio-api`, proyecto `core-502518`, `europe-west1` | Gratuito (2 M peticiones/mes); escala a 0, máx. 2 instancias |
| Base de datos | TiDB Cloud Starter `brio` (MySQL compatible), AWS Frankfurt | Gratuito (5 GiB), límite de gasto 0 $ |
| Fotos y archivos | Cloudflare R2, bucket privado `brio-fotos` | Gratuito (10 GB/mes) |
| Secretos | Secret Manager `brio-api-env` (un único `.env`) | Gratuito |

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
normal, desde `apps/api`:

```bash
set -a; . ./.env.cloudrun; set +a; npx prisma migrate deploy
```

Si una migración nueva junta varios cambios de esquema en un `ALTER TABLE`, hay
que partirla en varios (TiDB los admite de uno en uno). Además, el clúster
tiene `tidb_enable_clustered_index=OFF` para que las claves primarias se puedan
cambiar como en MySQL.
