#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${JAJAEGO_APP_DIR:-/opt/jajaego/app}"
ENV_FILE="${JAJAEGO_ENV_FILE:-${APP_DIR}/.env.vps}"
COMPOSE_FILE="${APP_DIR}/docker-compose.vps.yml"
HEALTH_URL="${JAJAEGO_HEALTH_URL:-http://127.0.0.1:4173/api/health}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "App repository not found at ${APP_DIR}."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "VPS environment file not found: ${ENV_FILE}"
  exit 1
fi

cd "${APP_DIR}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Deployment stopped because the VPS worktree has uncommitted changes."
  exit 1
fi

git fetch --prune origin
git pull --ff-only origin main

node scripts/vps-preflight.mjs --env-file "${ENV_FILE}"
bash deploy/vps/backup.sh

APP_IMAGE="$(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" config --images | head -n 1)"
CURRENT_IMAGE_ID="$(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" images -q app 2>/dev/null || true)"
if [[ -n "${CURRENT_IMAGE_ID}" ]]; then
  docker tag "${CURRENT_IMAGE_ID}" jajaego-app:vps-rollback
fi

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build --pull
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans

for attempt in {1..30}; do
  if curl --fail --silent "${HEALTH_URL}" > /dev/null; then
    echo "JAJAEGO deployment is healthy."
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
    exit 0
  fi
  sleep 2
done

echo "Health check failed. Recent application logs:"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" logs --tail=120 app

if docker image inspect jajaego-app:vps-rollback > /dev/null 2>&1; then
  echo "Restoring the previous application image."
  docker tag jajaego-app:vps-rollback "${APP_IMAGE}"
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --no-build --force-recreate app
fi

exit 1
