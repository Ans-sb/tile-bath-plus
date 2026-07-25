#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root: sudo bash deploy/vps/install-host.sh"
  exit 1
fi

apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  docker.io \
  docker-compose-v2 \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw

systemctl enable --now docker
systemctl enable --now nginx

install -d -m 0750 /var/lib/jajaego
install -d -m 0750 /var/lib/jajaego/data
install -d -m 0750 /var/lib/jajaego/uploads
install -d -m 0750 /var/lib/jajaego/outputs
install -d -m 0750 /var/backups/jajaego
chown -R 1000:1000 /var/lib/jajaego

ufw allow OpenSSH
ufw allow "Nginx Full"

echo "Host packages and persistent directories are ready."
echo "Review firewall rules, then enable UFW with: sudo ufw enable"
