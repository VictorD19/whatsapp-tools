#!/usr/bin/env bash
# Existing lab only. Its token is readable by cloudflared's unprivileged group.
set -euo pipefail
[[ $(id -u) == 0 && $(hostname -s) == SistemaZapChat ]] || exit 40
pilot_root=/opt/zapchat-instagram-lab
[[ $(pwd -P) == "$(readlink -f "$pilot_root/current")" ]] || exit 41
[[ $(docker image inspect cloudflare/cloudflared:2026.10.0 --format '{{.Config.User}}') == 65532:65532 ]] || exit 42
[[ -s "$pilot_root/private/cloudflared.token" ]] || exit 43
chmod 700 "$pilot_root/private"
chown root:65532 "$pilot_root/private/cloudflared.token"
chmod 640 "$pilot_root/private/cloudflared.token"
export PILOT_PRIVATE_DIR="$pilot_root/private" PILOT_RELEASE
PILOT_RELEASE=$(basename "$(pwd -P)")
docker compose -p zapchat-instagram-lab -f infra/instagram-host/shared-server.yml --profile public up -d --no-build --pull never tunnel
