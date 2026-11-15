#!/usr/bin/env bash
# Run only over SSH on the newly approved pilot Droplet, from its immutable release directory.
set -euo pipefail
pilot_id=${1:?Pass the newly created pilot Droplet ID}
pilot_release=${2:?Pass the immutable 40-character Git commit}
[[ "$pilot_id" =~ ^[0-9]+$ && "$pilot_id" != 557124676 ]] || exit 40
[[ "$pilot_release" =~ ^[a-f0-9]{40}$ ]] || exit 41
[[ $(hostname -s) == zapchat-instagram-pilot ]] || exit 42
[[ $(id -u) == 0 ]] || exit 43
actual_pilot_id=$(python3 -c 'import urllib.request; print(urllib.request.urlopen("http://169.254.169.254/metadata/v1/id",timeout=5).read().decode())')
[[ "$actual_pilot_id" == "$pilot_id" ]] || exit 44
pilot_root=/opt/zapchat-instagram-pilot
[[ $(pwd -P) == "$pilot_root/releases/$pilot_release" ]] || exit 45
[[ -f "$pilot_root/private/runtime.json" && -f "$pilot_root/private/db-password" ]] || exit 46
# This installer is for initial deployment. An upgrade must first use the backup/rollback procedure.
[[ ! -e "$pilot_root/current" ]] || exit 47
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 python3-cryptography ufw ca-certificates
systemctl enable --now docker
ufw allow OpenSSH
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
export PILOT_PRIVATE_DIR="$pilot_root/private" PILOT_RELEASE="$pilot_release"
docker compose --parallel 1 -f infra/instagram-host/compose.yml build
docker compose --parallel 1 -f infra/instagram-host/compose.yml up -d --no-build --wait --wait-timeout 180
python3 infra/instagram-host/backup.py --private-dir "$PILOT_PRIVATE_DIR" --compose-file infra/instagram-host/compose.yml --release "$pilot_release" --verify
ln -s "$pilot_root/releases/$pilot_release" "$pilot_root/current"
printf '%s\n' 'Pilot installed and restore verified. Public tunnel and DNS remain separate final steps.'
