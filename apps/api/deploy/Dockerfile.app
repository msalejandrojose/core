# Imagen de la API para producción: la base de dependencias + el código ya
# compilado. La monta deploy/deploy.sh (`build`) con un contexto mínimo que
# solo tiene este fichero, dist/, prisma/ y prisma.config.ts:
#
#   DEPS_IMAGE = …/api-deps:<huella>  (Dockerfile de la API, etapa `deps`)
#
# Equivale a la etapa `runtime` de apps/api/Dockerfile, pero sin instalar ni
# compilar nada aquí dentro: por eso es una capa de pocos MB.
ARG DEPS_IMAGE
FROM ${DEPS_IMAGE}
COPY --chown=app:app dist ./dist
COPY --chown=app:app prisma ./prisma
COPY --chown=app:app prisma.config.ts ./prisma.config.ts
