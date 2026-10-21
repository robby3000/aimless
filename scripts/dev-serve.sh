#!/usr/bin/env bash
# dev-serve — push a local public/ directory to a dev box and (re)start a
# tailnet-only TLS static server, so a real phone can test the PWA over HTTPS.
#
#   scripts/dev-serve.sh                   # serve ./public from this checkout
#   scripts/dev-serve.sh /path/to/public   # serve a worktree or other checkout
#
# Config: reads DEV_HOST, DEV_DOMAIN, DEV_BIND, DEV_PORT, DEV_REMOTE from
# scripts/dev-serve.env if present (gitignored — holds the box's tailnet
# details), else from the environment. See docs/ignore/local-ops.md.
#
# First run mints a Tailscale cert on the box (`tailscale cert`) into
# $DEV_REMOTE. Server logs to $DEV_REMOTE/serve.log.

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=scripts/dev-serve.env
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

DEV_HOST="${DEV_HOST:?set DEV_HOST (ssh target, e.g. user@host) in $ENV_FILE or env}"
DEV_DOMAIN="${DEV_DOMAIN:?set DEV_DOMAIN (tailnet https name) in $ENV_FILE or env}"
DEV_BIND="${DEV_BIND:-0.0.0.0}"
DEV_PORT="${DEV_PORT:-8444}"
DEV_REMOTE="${DEV_REMOTE:-.dev-serve}"

SRC="${1:-public}"
[ -d "$SRC" ] || { echo "dev-serve: no such directory: $SRC" >&2; exit 1; }

echo "-> rsync $SRC -> $DEV_HOST:$DEV_REMOTE/www/"
ssh "$DEV_HOST" "mkdir -p $DEV_REMOTE/www"
rsync -a --delete "$SRC"/ "$DEV_HOST:$DEV_REMOTE/www/"
scp -q scripts/dev-serve-tls.mjs "$DEV_HOST:$DEV_REMOTE/serve.mjs"

echo "-> ensure Tailscale cert on $DEV_HOST"
ssh "$DEV_HOST" "test -f $DEV_REMOTE/cert.pem || tailscale cert --cert-file $DEV_REMOTE/cert.pem --key-file $DEV_REMOTE/key.pem $DEV_DOMAIN"

echo "-> (re)start TLS server on :$DEV_PORT"
# pkill pattern is anchored to 'node ...' — an unanchored -f pattern matches
# this remote command's own bash -c cmdline and kills the ssh session itself.
ssh "$DEV_HOST" "pkill -f '^node .*serve\.mjs' 2>/dev/null || true; sleep 0.3
  DEV_BIND=$DEV_BIND DEV_PORT=$DEV_PORT setsid nohup node $DEV_REMOTE/serve.mjs \
    > $DEV_REMOTE/serve.log 2>&1 < /dev/null &
  sleep 0.6; ss -ltn | grep -q ':$DEV_PORT ' || { cat $DEV_REMOTE/serve.log >&2; exit 1; }"

echo
echo "Phone URL: https://$DEV_DOMAIN:$DEV_PORT/"
