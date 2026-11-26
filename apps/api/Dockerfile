# syntax=docker/dockerfile:1.7
#
# Imagen multi-stage para @core/api dentro del monorepo pnpm.
# Build context esperado: raíz del repo (NO apps/api/), para tener acceso a
# pnpm-workspace.yaml y al lockfile.
#
#   docker build -f apps/api/Dockerfile --target runtime -t core-api:latest .
#   docker build -f apps/api/Dockerfile --target migrate -t core-api-migrate:latest .
#

# ============================================================================
# Stage 1 — deps (dependencias del workspace de la api, con las de desarrollo)
# ============================================================================
# Va aparte de `builder` para que la imagen de migraciones salga de aquí: solo
# cambia cuando cambian el lockfile, packages/ o prisma/ (no con cada cambio de
# código), y es la caché entre despliegues de Cloud Build (deploy/cloudbuild.yaml).
FROM node:24-alpine AS deps

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# 1) Copiamos manifests + prisma schema/config para aprovechar la cache.
#    El schema de Prisma se incluye en esta capa porque la postinstall del
#    paquete `prisma` corre `prisma generate`, que necesita verlo.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
#    Los paquetes del workspace TIENEN que estar aquí: `--filter @core/api...`
#    incluye a sus dependencias internas, pero pnpm no puede resolver lo que no
#    está en el contexto. Sin esta línea el build falla al compilar, con
#    "Cannot find module '@core/shared-types'". Van enteros (manifest y fuente)
#    porque son paquetes pequeños y hay que compilarlos igual.
COPY packages/ ./packages/
# pnpm valida los parches del workspace (patchedDependencies) aunque no toquen a la API.
COPY patches/ ./patches/

# 2) Instalamos dependencias del workspace de la api (incluye dev, las
#    necesitamos para `nest build`). --frozen-lockfile = imagen reproducible.
RUN pnpm install --frozen-lockfile --filter @core/api...


# ============================================================================
# Stage 1b — build
# ============================================================================
FROM deps AS builder

# 3) Copiamos el resto del código y compilamos.
#    `prebuild` regenera el cliente de Prisma en `src/generated/prisma/`
#    antes de que `nest build` lo transpile a `dist/generated/prisma/`.
COPY apps/api/ apps/api/
#    Con `...` se compilan antes las dependencias internas: la api importa el
#    `dist/` de shared-types, no su fuente.
RUN pnpm --filter @core/api... build

# 4) `pnpm deploy` genera una carpeta autocontenida con solo deps de prod
#    y los archivos del paquete (incluido dist/). Es la forma oficial de
#    sacar un paquete de un workspace para deploy.
RUN pnpm --filter @core/api deploy --legacy --prod /out


# ============================================================================
# Stage 1c — migraciones (job de Cloud Run `brio-api-migrate`)
# ============================================================================
# Imagen aparte con la CLI de Prisma (dependencia de desarrollo) y la carpeta
# de migraciones, para aplicar `prisma migrate deploy` una vez por despliegue,
# antes de pasar el tráfico a la versión nueva (ver deploy/deploy.sh). No va en
# la imagen de runtime: migrar en cada arranque alargaría el arranque en frío.
# `prisma.config.ts` carga `dotenv/config`, que lee DATABASE_URL del .env de
# secretos que monta Cloud Run (DOTENV_CONFIG_PATH).
# Sale de `deps`, no de `builder`: para migrar basta con la CLI de Prisma, el
# schema y las migraciones (copiados antes del install). Así no lleva el código
# compilado ni /out, y no cambia en cada despliegue (antes pesaba ~2,7 GB y se
# volvía a subir casi entera cada vez).
FROM deps AS migrate
WORKDIR /repo/apps/api
ENV DOTENV_CONFIG_PATH=/secrets/.env
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy"]


# ============================================================================
# Stage 2 — runtime
# ============================================================================
FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Ejecutamos como usuario no-root
RUN addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /out/node_modules ./node_modules
COPY --from=builder --chown=app:app /out/dist ./dist
COPY --from=builder --chown=app:app /out/package.json ./package.json

# /app pertenece a root por defecto, así que el user `app` no puede crear
# subdirectorios en él. Damos la propiedad al user de runtime y dejamos
# preparado el directorio para el storage local (driver LOCAL en dev).
RUN mkdir -p /app/.storage && chown -R app:app /app

USER app
EXPOSE 3000

CMD ["node", "dist/main.js"]
