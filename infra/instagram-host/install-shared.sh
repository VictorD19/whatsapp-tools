#!/usr/bin/env bash
# Existing SistemaZapChat host only. Prebuilt image, isolated resources, no OS changes.
set -euo pipefail
pilot_release=${1:?Pass the prepared release identifier}
[[ "$pilot_release" =~ ^[a-z0-9][a-z0-9.-]{0,63}$ ]] || exit 40
[[ $(id -u) == 0 && $(hostname -s) == SistemaZapChat ]] || exit 41
pilot_root=/opt/zapchat-instagram-lab
[[ $(pwd -P) == "$pilot_root/releases/$pilot_release" ]] || exit 42
[[ ! -e "$pilot_root/current" && ! -L "$pilot_root/current" ]] || exit 43
command -v docker >/dev/null
docker compose version >/dev/null
python3 -c 'import cryptography.hazmat.primitives.ciphers.aead' || exit 44
python3 - <<'PY'
import urllib.request
assert urllib.request.urlopen('http://169.254.169.254/metadata/v1/id', timeout=5).read().decode().strip() == '557124676'
PY
[[ -f "$pilot_root/private/runtime.json" && -f "$pilot_root/private/db-password" ]] || exit 45
export PILOT_PRIVATE_DIR="$pilot_root/private" PILOT_RELEASE="$pilot_release"
compose=(docker compose -p zapchat-instagram-lab -f infra/instagram-host/shared-server.yml)
[[ -z $(docker ps -aq --filter label=com.docker.compose.project=zapchat-instagram-lab) ]] || exit 46
# Fail closed rather than merge pre-existing volumes from an earlier installation.
[[ -z $(docker volume ls -q --filter label=com.docker.compose.project=zapchat-instagram-lab) ]] || exit 47
[[ $(docker image inspect "zapchat-instagram-pilot:$pilot_release" --format '{{.Architecture}}') == amd64 ]] || exit 48
for image in pgvector/pgvector:pg16 redis:7-alpine; do docker image inspect "$image" >/dev/null; done
available_kib=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)
free_kib=$(df -Pk "$pilot_root" | awk 'NR==2 {print $4}')
(( available_kib >= 1572864 && free_kib >= 8388608 )) || exit 49
mkdir -p -m 700 "$pilot_root/receipts"
receipt="$pilot_root/receipts/install-$pilot_release"
umask 077
# Snapshot identity/start times only; never read production env or database contents.
python3 - "$receipt.before.json" <<'PY'
import json, subprocess, sys
names=['wt-web','wt-api','wt-redis','wt-evolution','wt-postgres','wt-minio']
items=json.loads(subprocess.check_output(['docker','inspect',*names]))
assert all(x['State']['Running'] for x in items)
json.dump({x['Name']: {'id': x['Id'], 'startedAt': x['State']['StartedAt']} for x in items},open(sys.argv[1],'w'))
PY
started=false
cleanup() {
  status=$?
  if [[ $status != 0 && $started == true ]]; then "${compose[@]}" stop --timeout 20 || true; fi
  python3 - "$receipt.before.json" "$receipt.after.json" <<'PY'
import json, subprocess, sys
before=json.load(open(sys.argv[1]))
items=json.loads(subprocess.check_output(['docker','inspect',*before.keys()]))
after={x['Name']: {'id': x['Id'], 'startedAt': x['State']['StartedAt']} for x in items}
unchanged=before==after and all(x['State']['Running'] for x in items)
json.dump({'productionIdentityAndStartTimesUnchanged': unchanged, 'services': after},open(sys.argv[2],'w'))
if not unchanged: raise SystemExit('Production state changed during the observation; investigate without restarting it')
PY
}
trap cleanup EXIT
started=true
"${compose[@]}" up -d --no-build --pull never --wait --wait-timeout 240
python3 infra/instagram-host/backup.py --private-dir "$PILOT_PRIVATE_DIR" --compose-file infra/instagram-host/shared-server.yml --project zapchat-instagram-lab --release "$pilot_release" --verify > "$receipt.backup.json"
ln -s "$pilot_root/releases/$pilot_release" "$pilot_root/current"
printf '%s\n' 'Isolated lab healthy; its database restore was verified. Public routing is not changed by this installer.'
