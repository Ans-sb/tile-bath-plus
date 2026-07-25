#!/usr/bin/env bash
set -Eeuo pipefail

PERSIST_ROOT="${JAJAEGO_PERSIST_ROOT:-/var/lib/jajaego}"
BACKUP_DIR="${JAJAEGO_BACKUP_DIR:-/var/backups/jajaego}"
RETENTION_DAYS="${JAJAEGO_BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="${BACKUP_DIR}/jajaego-persistent-${STAMP}.tar.gz"

for required in data uploads outputs; do
  if [[ ! -d "${PERSIST_ROOT}/${required}" ]]; then
    echo "Missing persistent directory: ${PERSIST_ROOT}/${required}"
    exit 1
  fi
done

install -d -m 0750 "${BACKUP_DIR}"
tar -czf "${ARCHIVE}" -C "${PERSIST_ROOT}" data uploads outputs
(
  cd "${BACKUP_DIR}"
  sha256sum "$(basename "${ARCHIVE}")" > "$(basename "${ARCHIVE}").sha256"
)

if [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] && (( RETENTION_DAYS > 0 )); then
  find "${BACKUP_DIR}" -maxdepth 1 -type f \
    \( -name 'jajaego-persistent-*.tar.gz' -o -name 'jajaego-persistent-*.tar.gz.sha256' \) \
    -mtime "+${RETENTION_DAYS}" -delete
fi

echo "Backup created: ${ARCHIVE}"
