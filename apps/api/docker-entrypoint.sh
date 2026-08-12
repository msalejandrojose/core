#!/bin/sh
# Aplica las migraciones de Prisma pendientes antes de arrancar la API, para
# que un deploy en un PaaS (o `docker compose up`) no requiera un paso manual
# aparte. Usa `prisma migrate deploy` (no `dev`): no crea shadow database ni
# genera migraciones nuevas, solo aplica las que ya están en prisma/migrations.
set -e

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-3306}/${DB_NAME}"
fi

echo "→ Aplicando migraciones de Prisma pendientes..."
node_modules/.bin/prisma migrate deploy

exec node dist/main.js
