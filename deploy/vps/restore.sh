#!/usr/bin/env bash
set -Eeuo pipefail

ARCHIVE="${1:-}"
CONFIRM="${2:-}"
PERSIST_ROOT="${JAJAEGO_PERSIST_ROOT:-/var/lib/jajaego}"
APP_DIR="${JAJAEGO_APP_DIR:-/opt/jajaego/app}"
ENV_FILE="${JAJAEGO_ENV_FILE:-${APP_DIR}/.env.vps}"
COMPOSE_FILE="${APP_DIR}/docker-compose.vps.yml"

if [[ -z "${ARCHIVE}" || "${CONFIRM}" != "--confirm" ]]; then
  echo "Usage: sudo bash deploy/vps/restore.sh /path/to/backup.tar.gz --confirm"
  exit 1
fi

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Backup archive not found: ${ARCHIVE}"
  exit 1
fi

if [[ -f "${ARCHIVE}.sha256" ]]; then
  (
    cd "$(dirname "${ARCHIVE}")"
    sha256sum --check "$(basename "${ARCHIVE}").sha256"
  )
fi

if tar -tzf "${ARCHIVE}" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo "Unsafe archive path detected."
  exit 1
fi

if tar -tzf "${ARCHIVE}" | grep -Ev '^(data|uploads|outputs)(/|$)' | grep -q .; then
  echo "Archive contains unexpected paths."
  exit 1
fi

cd "${APP_DIR}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" stop app
restore_completed=false
trap 'if [[ "${restore_completed}" != "true" ]]; then docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d app || true; fi' EXIT
bash deploy/vps/backup.sh
tar -xzf "${ARCHIVE}" -C "${PERSIST_ROOT}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d app
restore_completed=true

echo "Restore completed. Verify ${JAJAEGO_HEALTH_URL:-http://127.0.0.1:4173/api/health}."
