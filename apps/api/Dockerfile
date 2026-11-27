# syntax=docker/dockerfile:1.7
#
# Imagen multi-stage para @core/api dentro del monorepo pnpm.
# Build context esperado: raíz del repo (NO apps/api/), para tener acceso a
# pnpm-workspace.yaml y al lockfile.
#
#   docker build -f apps/api/Dockerfile -t core-api:latest .            # imagen completa (docker-compose)
#   docker build -f apps/api/Dockerfile --target deps -t api-deps .     # solo la base de dependencias
#
# En producción (deploy/deploy.sh) la imagen se monta en dos pisos:
#   1. `deps` → api-deps:<huella>: Node + dependencias de producción. Solo se
#      construye cuando cambia algo de lo que define las dependencias (lockfile,
#      package.json, packages/, patches/ o este Dockerfile); si no, se reutiliza.
#   2. deploy/Dockerfile.app → api:<commit>: esa base + el código compilado y
#      prisma/. Es una capa de pocos MB.
# Una sola imagen para todo: el servicio (CMD) y, con otro comando, el job de
# migraciones (`prisma migrate deploy`) y el de seed.
#
# Si cambias qué se copia en `deps-install`, cambia también DEPS_INPUTS en
# deploy/deploy.sh: es la lista de lo que entra en la huella.

# ============================================================================
# Stage 1 — dependencias (con las de desarrollo) y paquetes del workspace
# ============================================================================
FROM node:24-alpine AS deps-install

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# Solo lo que define las dependencias: el código de la API no entra aquí, así
# que cambiarlo no invalida esta etapa.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
#    Los paquetes del workspace TIENEN que estar aquí: `--filter @core/api...`
#    incluye a sus dependencias internas, pero pnpm no puede resolver lo que no
#    está en el contexto ("Cannot find module '@core/shared-types'").
COPY packages/ ./packages/
# pnpm valida los parches del workspace (patchedDependencies) aunque no toquen a la API.
COPY patches/ ./patches/

# Con las de desarrollo: hacen falta para compilar (etapa builder).
RUN pnpm install --frozen-lockfile --filter @core/api...
# Compila los paquetes internos: la API importa su dist/, no su fuente.
RUN pnpm --filter "@core/api^..." build
# Carpeta autocontenida con solo las dependencias de producción (incluidos
# los paquetes del workspace ya compilados).
RUN pnpm --filter @core/api deploy --legacy --prod /out


# ============================================================================
# Stage 2 — base de producción: api-deps:<huella>
# ============================================================================
FROM node:24-alpine AS deps

# DOTENV_CONFIG_PATH: prisma.config.ts carga dotenv/config, que lee
# DATABASE_URL del .env de secretos que monta Cloud Run. La API no usa dotenv.
ENV NODE_ENV=production \
    PORT=3000 \
    DOTENV_CONFIG_PATH=/secrets/.env

WORKDIR /app

# Ejecutamos como usuario no-root
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps-install --chown=app:app /out/node_modules ./node_modules
COPY --from=deps-install --chown=app:app /out/package.json ./package.json

# /app pertenece a root por defecto, así que el user `app` no puede crear
# subdirectorios en él. Damos la propiedad al user de runtime y dejamos
# preparado el directorio para el storage local (driver LOCAL en dev).
RUN mkdir -p /app/.storage && chown -R app:app /app

USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]


# ============================================================================
# Stage 3 — compilación de la API (para la imagen completa)
# ============================================================================
FROM deps-install AS builder
#    `prebuild` regenera el cliente de Prisma en `src/generated/prisma/`
#    antes de que `nest build` lo transpile a `dist/generated/prisma/`.
COPY apps/api/ apps/api/
RUN pnpm --filter @core/api build


# ============================================================================
# Stage 4 — runtime completo (docker-compose y construcción sin base)
# ============================================================================
# Lo mismo que monta deploy/Dockerfile.app, pero compilando aquí dentro.
# Migraciones: el job `brio-api-migrate` usa esta misma imagen con el comando
# `prisma migrate deploy` (la CLI de Prisma y dotenv son dependencias de
# producción). Se aplican una vez por despliegue, no al arrancar.
FROM deps AS runtime
COPY --from=builder --chown=app:app /repo/apps/api/dist ./dist
COPY --chown=app:app apps/api/prisma ./prisma
COPY --chown=app:app apps/api/prisma.config.ts ./prisma.config.ts
