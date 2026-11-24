#!/bin/sh
# Farmer 360 startup — database first, then the app (machine bootstrap).
#
# Run this on a fresh machine / Codespace. It is safe to run with sudo — the
# script re-executes itself as the normal user, because Postgres (initdb,
# postgres) refuses to run as root.
#
# Purpose split (shared DB logic lives in scripts/lib-db.sh):
#   startup.sh = machine BOOTSTRAP → installs Postgres if missing, starts the
#                database, starts the app in the BACKGROUND, verifies it
#                responds. Returns control to the shell.
#   run.sh     = daily DEV RUN     → checks/report, app in the FOREGROUND.
#   update.sh  = periodic UPDATE   → applies updates + full verification sweep.
#
# Database resolution (see lib-db.sh resolve_database):
#   1. DATABASE_URL set to postgres:// or postgresql:// (Supabase, Neon, …)
#      → used as-is, migrations applied to it.
#   2. A local Postgres → cluster created under .localdb/ if needed, server
#      started (port 5432, or 5433 if something else owns 5432), farmer360
#      database created, migrations applied.
#   3. No Postgres on the machine → installed automatically via the system
#      package manager (apt/dnf/yum/apk), then prepared as in (2).
#   4. All of the above unavailable → the app boots on its embedded PGLite
#      database (self-migrating, resets on restart).
#
# The demo accounts (and all desk content) are seeded by the app itself at
# server bootstrap, for every backend, so no seed step is needed here.
set -eu
cd "$(dirname "$0")"
log() { printf '[startup] %s\n' "$*"; }
. ./scripts/lib-db.sh
drop_root "$@"

# ── 0. Already running? ──────────────────────────────────────────────────────
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  log "Farmer 360 is already running on http://localhost:8080 — nothing to do"
  exit 0
fi

# ── 1. Dependencies ──────────────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  log "installing dependencies…"
  npm ci --no-audit --no-fund >/tmp/run-install.log 2>&1 \
    || npm install --no-audit --no-fund >>/tmp/run-install.log 2>&1 \
    || { log "dependency install failed — see /tmp/run-install.log"; }
fi

# ── 2. Database ──────────────────────────────────────────────────────────────
resolve_database 1

# ── 3. Start the app in the background and verify it responds ────────────────
log "starting Farmer 360 on http://0.0.0.0:8080 (demo accounts seed themselves)"
npm run dev >>/tmp/app-startup.log 2>&1 &
APP_PID=$!

log "waiting for the server to come up…"
UP=0
i=0
while [ "$i" -lt 20 ]; do
  if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
    UP=1
    break
  fi
  sleep 1
  i=$((i + 1))
done

if [ "$UP" = 1 ]; then
  log "✔ Farmer 360 is up on http://localhost:8080 (pid $APP_PID, log: /tmp/app-startup.log)"
else
  log "✖ server did not respond within 20s — last log lines:"
  tail -n 15 /tmp/app-startup.log 2>/dev/null | sed 's/^/         /'
  log "full log: /tmp/app-startup.log"
fi
