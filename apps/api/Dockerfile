# syntax=docker/dockerfile:1.7
#
# Imagen multi-stage para @core/api dentro del monorepo pnpm.
# Build context esperado: raíz del repo (NO apps/api/), para tener acceso a
# pnpm-workspace.yaml y al lockfile.
#
#   docker build -f apps/api/Dockerfile -t core-api:latest .
#

# ============================================================================
# Stage 1 — deps + build
# ============================================================================
FROM node:24-alpine AS builder

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# 1) Copiamos manifests + prisma schema/config para aprovechar la cache.
#    El schema de Prisma se incluye en esta capa porque la postinstall del
#    paquete `prisma` corre `prisma generate`, que necesita verlo.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# 2) Instalamos dependencias del workspace de la api (incluye dev, las
#    necesitamos para `nest build`). --frozen-lockfile = imagen reproducible.
RUN pnpm install --frozen-lockfile --filter @core/api...

# 3) Copiamos el resto del código y compilamos.
#    `prebuild` regenera el cliente de Prisma en `src/generated/prisma/`
#    antes de que `nest build` lo transpile a `dist/generated/prisma/`.
COPY apps/api/ apps/api/
RUN pnpm --filter @core/api build

# 4) `pnpm deploy` genera una carpeta autocontenida con solo deps de prod
#    y los archivos del paquete (incluido dist/). Es la forma oficial de
#    sacar un paquete de un workspace para deploy.
RUN pnpm --filter @core/api deploy --legacy --prod /out


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

USER app
EXPOSE 3000

CMD ["node", "dist/main.js"]
