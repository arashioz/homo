#!/bin/sh
set -eu
cd "$(dirname "$0")"

if docker compose version >/dev/null 2>&1; then
  exec docker compose up --build --detach "$@"
fi

if command -v docker-compose >/dev/null 2>&1; then
  exec docker-compose up --build -d "$@"
fi

echo "Docker Compose پیدا نشد. روی سرور این را بزن:"
echo "  apt-get update && apt-get install -y docker-compose-plugin"
echo "بعد دوباره:"
echo "  docker compose up --build --detach"
exit 1
