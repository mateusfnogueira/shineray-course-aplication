
#!/bin/sh
set -eu

# Carrega Docker secrets, quando disponíveis
if [ -f /run/secrets/database_url ]; then
  export DATABASE_URL="$(cat /run/secrets/database_url)"
fi

if [ -f /run/secrets/jwt_access_secret ]; then
  export JWT_ACCESS_SECRET="$(cat /run/secrets/jwt_access_secret)"
fi

if [ -f /run/secrets/jwt_refresh_secret ]; then
  export JWT_REFRESH_SECRET="$(cat /run/secrets/jwt_refresh_secret)"
fi

echo "[entrypoint] Checking required environment..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is missing"
  exit 1
fi

echo "[entrypoint] Running Prisma migrations..."

if [ -x ./node_modules/.bin/prisma ]; then
  PRISMA_BIN="./node_modules/.bin/prisma"
elif [ -x ./apps/api/node_modules/.bin/prisma ]; then
  PRISMA_BIN="./apps/api/node_modules/.bin/prisma"
else
  echo "[entrypoint] ERROR: Prisma CLI not found"
  exit 1
fi

"$PRISMA_BIN" migrate deploy \
  --schema=./prisma/schema.prisma

echo "[entrypoint] Starting NestJS..."
exec "$@"

