#!/bin/sh
set -eu

lock_hash="$(sha256sum package-lock.json | cut -d ' ' -f 1)"
marker="node_modules/.package-lock.sha256"

if [ ! -f "$marker" ] || [ "$(cat "$marker")" != "$lock_hash" ]; then
  npm ci
  printf '%s\n' "$lock_hash" > "$marker"
fi

exec "$@"
