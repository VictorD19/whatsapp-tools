"""Backup and restore verification for the isolated pilot only; no public endpoints."""
import argparse
import datetime
import json
import os
from pathlib import Path
import secrets
import subprocess
from urllib.parse import urlparse
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

parser = argparse.ArgumentParser()
parser.add_argument('--private-dir', type=Path, required=True)
parser.add_argument('--compose-file', type=Path, required=True)
parser.add_argument('--override', type=Path)
parser.add_argument('--project', default='zapchat-instagram-host', choices=['zapchat-instagram-host', 'zapchat-instagram-host-validation', 'zapchat-instagram-lab', 'zapchat-instagram-lab-validation'])
parser.add_argument('--release', required=True)
parser.add_argument('--docker', default='docker')
parser.add_argument('--docker-host')
parser.add_argument('--verify', action='store_true')
args = parser.parse_args()
config = json.loads((args.private_dir / 'runtime.json').read_text())
url = urlparse(config['databaseUrl'])
if url.hostname != 'postgres' or url.path != '/instagram_review' or url.username != 'instagram_review':
    raise SystemExit('Refusing a different database')
key = bytes.fromhex(config['backupKey'])
if len(key) != 32:
    raise SystemExit('Invalid isolated backup key')
command = [args.docker]
if args.docker_host:
    command += ['--host', args.docker_host]
command += ['compose', '-p', args.project, '-f', str(args.compose_file.resolve())]
if args.override:
    command += ['-f', str(args.override.resolve())]
env = {**os.environ, 'PILOT_PRIVATE_DIR': str(args.private_dir.resolve()), 'PILOT_RELEASE': args.release}

def postgres(*arguments, data=None):
    result = subprocess.run(command + ['exec', '-T', 'postgres', *arguments], input=data, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, env=env, check=False)
    if result.returncode:
        # Database errors can include SQL data; keep them out of shared logs.
        raise RuntimeError('Isolated database command failed')
    return result.stdout

dump = postgres('pg_dump', '-U', 'instagram_review', '-d', 'instagram_review', '--format=custom', '--no-owner')
nonce = secrets.token_bytes(12)
encrypted = b'ZCIG1' + nonce + AESGCM(key).encrypt(nonce, dump, b'zapchat-instagram-pilot-v1')
folder = args.private_dir / 'backups'
folder.mkdir(mode=0o700, exist_ok=True)
path = folder / ('instagram-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.dump.aesgcm')
with path.open('xb') as stream:
    os.chmod(path, 0o600)
    stream.write(encrypted)
result = {'encryptedBackup': str(path), 'bytes': len(encrypted), 'restoreVerified': False}
if args.verify:
    restore = 'instagram_restore_' + secrets.token_hex(6)
    created = False
    try:
        recovered = AESGCM(key).decrypt(encrypted[5:17], encrypted[17:], b'zapchat-instagram-pilot-v1')
        postgres('createdb', '-U', 'instagram_review', restore)
        created = True
        postgres('pg_restore', '-U', 'instagram_review', '-d', restore, '--exit-on-error', '--no-owner', data=recovered)
        count = postgres('psql', '-U', 'instagram_review', '-d', restore, '-At', '-c', 'SELECT count(*) FROM "User";').decode().strip()
        result.update(restoreVerified=True, restoredUsers=int(count))
    finally:
        if created:
            postgres('dropdb', '-U', 'instagram_review', restore)
print(json.dumps(result))
