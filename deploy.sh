#!/usr/bin/env bash
# Deploy SpellCheckerKa to schecker.ge
# Usage: ./deploy.sh [user@host]
set -e

HOST="${1:-deploy@schecker.ge}"
APP_DIR="/opt/spellcheckerka"

echo "==> Building Docker image..."
docker build -f docker/Dockerfile -t spellcheckerka:latest .

echo "==> Saving image..."
docker save spellcheckerka:latest | gzip > /tmp/spellcheckerka.tar.gz

echo "==> Uploading to ${HOST}..."
scp /tmp/spellcheckerka.tar.gz "${HOST}:/tmp/spellcheckerka.tar.gz"
scp docker/docker-compose.yml "${HOST}:${APP_DIR}/docker-compose.yml"

echo "==> Deploying on server..."
ssh "${HOST}" bash <<'REMOTE'
set -e
cd /opt/spellcheckerka
docker load < /tmp/spellcheckerka.tar.gz
rm /tmp/spellcheckerka.tar.gz
docker compose up -d --force-recreate app
echo "Done."
REMOTE

rm /tmp/spellcheckerka.tar.gz
echo "==> Deploy complete!"
