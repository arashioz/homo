#!/bin/sh
set -eu
cd "$(dirname "$0")"

BUILD=1
if [ "${1:-}" = "--no-build" ]; then
  BUILD=0
  shift
fi

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

if [ "$BUILD" = "1" ]; then
  for service in crm-backend crm-frontend web-frontend; do
    echo "==> building $service"
    $COMPOSE build "$service"
  done
fi

# The seed service shares the backend image; startup must never trigger another
# build. With --no-build, all application images must already exist locally.
$COMPOSE up --detach --no-build "$@"
$COMPOSE ps
