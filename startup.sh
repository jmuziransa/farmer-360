#!/bin/sh
set -eu
# Restart contract: idempotent, binds 0.0.0.0:8080, starts via npm run dev.
cd "$(dirname "$0")"
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
