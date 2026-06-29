#!/usr/bin/env bash
set -euo pipefail

PB_DIR="${PB_DIR:-/opt/pocketbase}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/pocketbase}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%F_%H%M%S)"
ARCHIVE="${BACKUP_DIR}/pocketbase_${STAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

was_active=0
if systemctl is-active --quiet pocketbase; then
  was_active=1
  systemctl stop pocketbase
fi

cleanup() {
  if [ "${was_active}" = "1" ]; then
    systemctl start pocketbase
  fi
}
trap cleanup EXIT

tar -C "${PB_DIR}" -czf "${ARCHIVE}" pb_data pb_migrations
find "${BACKUP_DIR}" -type f -name 'pocketbase_*.tar.gz' -mtime "+${KEEP_DAYS}" -delete

echo "${ARCHIVE}"
