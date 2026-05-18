#!/usr/bin/env sh
set -eu

echo "Docker Compose service status:"
docker compose ps

echo ""
echo "Postgres health:"
docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-ecommerce_user}" -d "${POSTGRES_DB:-ecommerce}"

echo ""
echo "Redis health:"
docker compose exec -T redis redis-cli ping
