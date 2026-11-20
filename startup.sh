#!/bin/sh
# Farmer 360 startup — database first, then the app.
#
# Contract: idempotent, binds 0.0.0.0:8080, starts via `npm run dev`.
#
# Database resolution, in order:
#   1. `DATABASE_URL` set to a postgres:// or postgresql:// URL — used as-is.
#      That covers Supabase, Neon or any hosted Postgres: nothing to install,
#      migrations are applied to it below.
#   2. A local Postgres — cluster created under `.localdb/` if needed, server
#      started, `farmer360` database created, migrations applied.
#   3. No Postgres on the machine — it is INSTALLED automatically via the
#      system package manager (apt/dnf/yum/apk), then prepared as in (2).
#   4. All of the above unavailable — the app still boots on its embedded
#      PGLite database (self-migrating, resets on restart).
#
# The demo accounts (and all desk content) are seeded by the app itself at
# server bootstrap, for every backend, so no seed step is needed here.
set -eu
cd "$(dirname "$0")"

log() { printf '[startup] %s\n' "$*"; }

# ── 0. Already running? ──────────────────────────────────────────────────────
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi

# ── 1. Dependencies ──────────────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  log "installing dependencies…"
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
fi

# ── 2. Database ──────────────────────────────────────────────────────────────
find_pg() {
  if command -v psql >/dev/null 2>&1; then
    command -v psql
    return 0
  fi
  for dir in /usr/lib/postgresql/*/bin /usr/pgsql-*/bin /usr/local/pgsql/bin; do
    if [ -x "$dir/psql" ]; then
      echo "$dir/psql"
      return 0
    fi
  done
  return 1
}

install_pg() {
  log "Postgres not found — installing it automatically"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y >/dev/null 2>&1 || true
    apt-get install -y postgresql
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y postgresql-server postgresql
  elif command -v yum >/dev/null 2>&1; then
    yum install -y postgresql-server postgresql
  elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache postgresql
  else
    log "no supported package manager (apt/dnf/yum/apk) found"
    return 1
  fi
}

ensure_local_pg() {
  PG_BIN_DIR=$(dirname "$1")
  PGDATA="$PWD/.localdb/pgdata"
  mkdir -p "$PGDATA"

  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    log "initialising a fresh Postgres cluster in .localdb/pgdata"
    "$PG_BIN_DIR/initdb" -U farmer -A trust -E utf8 --no-locale >/tmp/pg-init.log 2>&1 || {
      log "initdb failed — see /tmp/pg-init.log"
      return 1
    }
  fi

  if ! "$PG_BIN_DIR/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    log "starting local Postgres on port 5432"
    "$PG_BIN_DIR/pg_ctl" -D "$PGDATA" -l /tmp/pg-server.log -w start >/dev/null 2>&1 || {
      log "pg_ctl start failed — see /tmp/pg-server.log"
      return 1
    }
  fi

  # Create the app database once (idempotent on every later start).
  "$PG_BIN_DIR/psql" -h 127.0.0.1 -p 5432 -U farmer -d postgres -c "create database farmer360" >/dev/null 2>&1 || true

  DATABASE_URL="postgresql://farmer@127.0.0.1:5432/farmer360"
  export DATABASE_URL
  log "local Postgres ready — DATABASE_URL=$DATABASE_URL"
}

PG_READY=0
case "${DATABASE_URL:-}" in
  postgres://* | postgresql://*)
    log "using DATABASE_URL (Supabase / Neon / hosted Postgres)"
    PG_READY=1
    ;;
  "")
    log "DATABASE_URL not set — looking for local Postgres"
    ;;
  *)
    log "DATABASE_URL is set but is not a postgres:// URL — ignoring it"
    ;;
esac

if [ "$PG_READY" = 0 ]; then
  if PG_BIN=$(find_pg); then
    ensure_local_pg "$PG_BIN" && PG_READY=1
  elif install_pg && PG_BIN=$(find_pg); then
    ensure_local_pg "$PG_BIN" && PG_READY=1
  fi
fi

if [ "$PG_READY" = 1 ]; then
  log "applying database migrations…"
  if ! npm run db:migrate; then
    log "migration failed — falling back to the embedded PGLite database"
    unset DATABASE_URL
  fi
else
  log "no Postgres available — the app will use its embedded PGLite database"
fi

# ── 3. Start the app ─────────────────────────────────────────────────────────
log "starting Farmer 360 on http://0.0.0.0:8080 (demo accounts seed themselves)"
npm run dev >>/tmp/app-startup.log 2>&1 &
