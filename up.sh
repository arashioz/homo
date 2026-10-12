#!/bin/sh
set -eu
cd "$(dirname "$0")"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Docker Compose پیدا نشد. اول افزونه compose را نصب کن."
  exit 1
fi

# Parallel builds get OOM-killed on small servers, so build one image at a time.
export COMPOSE_BAKE=false
export COMPOSE_PARALLEL_LIMIT=1

for service in crm-backend crm-frontend web-frontend; do
  echo "==> building $service"
  $COMPOSE build "$service"
done

$COMPOSE up --detach "$@"
$COMPOSE ps
