#!/usr/bin/env sh
set -eu

echo "Docker Compose service status:"
docker compose ps

echo ""
echo "Postgres health:"
docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo ""
echo "Redis health:"
docker compose exec -T redis redis-cli ping
