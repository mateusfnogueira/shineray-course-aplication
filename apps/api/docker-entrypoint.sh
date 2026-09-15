#!/bin/sh
set -e

# Resolve Docker secrets when running in Swarm/ECS (falls back to env vars if files absent)
[ -f /run/secrets/database_url ]       && export DATABASE_URL=$(cat /run/secrets/database_url)
[ -f /run/secrets/jwt_access_secret ]  && export JWT_ACCESS_SECRET=$(cat /run/secrets/jwt_access_secret)
[ -f /run/secrets/jwt_refresh_secret ] && export JWT_REFRESH_SECRET=$(cat /run/secrets/jwt_refresh_secret)

echo "[entrypoint] Running database migrations..."
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting application..."
exec "$@"
