#!/usr/bin/env bash
# Deploy ScheckerGe to schecker.ge
# Usage: ./deploy.sh [user@host]
set -e

HOST="${1:-deploy@schecker.ge}"
APP_DIR="/opt/scheckerge"

echo "==> Building Docker image..."
docker build -t scheckerge:latest .

echo "==> Saving image..."
docker save scheckerge:latest | gzip > /tmp/scheckerge.tar.gz

echo "==> Uploading to ${HOST}..."
scp /tmp/scheckerge.tar.gz "${HOST}:/tmp/scheckerge.tar.gz"
scp docker-compose.yml "${HOST}:${APP_DIR}/docker-compose.yml"

echo "==> Deploying on server..."
ssh "${HOST}" bash <<'REMOTE'
set -e
cd /opt/scheckerge

docker load < /tmp/scheckerge.tar.gz
rm /tmp/scheckerge.tar.gz

docker compose up -d --force-recreate app
echo "Done."
REMOTE

rm /tmp/scheckerge.tar.gz
echo "==> Deploy complete!"
