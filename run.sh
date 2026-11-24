#!/bin/sh
# Farmer 360 daily run — run.sh
#
# One command to start the day:
#   1. Dependency check — installs node_modules if missing, then reports
#      packages that have newer versions available (npm outdated). Updates
#      are REPORTED, never applied automatically.
#   2. Postgres check — uses DATABASE_URL if set; otherwise looks for a local
#      Postgres: uses a running one, starts the .localdb cluster if it is
#      merely stopped, or initializes a fresh cluster if none exists yet, and
#      applies migrations. If no Postgres can be reached, the app falls back
#      to its embedded PGLite database.
#   3. Build check — runs a full production build purely as an error scan.
#      If it finds errors they are printed to the terminal, but the script
#      DOES NOT STOP: it always goes on to start the dev server.
#   4. Starts the app — `npm run dev` in the foreground on 0.0.0.0:8080.
#
# Never aborts on a check failure — every failure is reported and the run
# continues. Demo accounts and desk content seed themselves at app bootstrap.
set -u
cd "$(dirname "$0")"

LOG()  { printf '[run] %s\n' "$*"; }
OK()   { printf '[run] ✔ %s\n' "$*"; }
WARN() { printf '[run] ⚠ %s\n' "$*"; }
ERR()  { printf '[run] ✖ %s\n' "$*"; }

PROBLEMS=0
note_problem() { PROBLEMS=$((PROBLEMS + 1)); }

# ── 0. Already running? ──────────────────────────────────────────────────────
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  WARN "the app is already running on http://127.0.0.1:8080 — nothing to do"
  exit 0
fi

echo "=============================================================="
echo " Farmer 360 daily run — $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================================="

# ── 1. Dependencies: install if missing, report available updates ───────────
LOG "checking dependencies…"
if [ ! -d node_modules ]; then
  LOG "node_modules missing — installing dependencies…"
  npm ci --no-audit --no-fund >/tmp/run-install.log 2>&1 \
    || npm install --no-audit --no-fund >>/tmp/run-install.log 2>&1
  if [ -d node_modules ]; then
    OK "dependencies installed"
  else
    ERR "dependency install failed — see /tmp/run-install.log (continuing)"
    note_problem
  fi
else
  OK "node_modules present"
fi

if command -v npm >/dev/null 2>&1 && [ -d node_modules ]; then
  OUTDATED=$(npm outdated 2>/dev/null || true)
  if [ -n "$OUTDATED" ]; then
    WARN "dependency updates available (reported only — nothing was upgraded):"
    printf '%s\n' "$OUTDATED" | sed 's/^/         /'
    note_problem
  else
    OK "all dependencies are up to date"
  fi
fi

# ── 2. Postgres: reachable, startable, migrated ─────────────────────────────
LOG "checking Postgres…"

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

PG_READY=0
case "${DATABASE_URL:-}" in
  postgres://* | postgresql://*)
    OK "using DATABASE_URL (hosted Postgres)"
    PG_READY=1
    ;;
  "")
    if PG_BIN=$(find_pg); then
      PG_BIN_DIR=$(dirname "$PG_BIN")
      PGDATA="$PWD/.localdb/pgdata"
      if "$PG_BIN_DIR/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
        OK "local Postgres is running on port 5432"
      elif [ -s "$PGDATA/PG_VERSION" ]; then
        LOG "local Postgres cluster found but stopped — starting it…"
        if "$PG_BIN_DIR/pg_ctl" -D "$PGDATA" -l /tmp/pg-server.log -w start >/dev/null 2>&1; then
          OK "local Postgres started"
        else
          ERR "could not start local Postgres — see /tmp/pg-server.log"
          note_problem
        fi
      else
        # Postgres is installed but no cluster exists yet (fresh machine or a
        # deleted .localdb) — initialize one so real Postgres is used instead
        # of silently dropping to the throwaway PGLite database.
        LOG "no local cluster at .localdb/pgdata — initializing a fresh one…"
        mkdir -p "$PGDATA"
        if "$PG_BIN_DIR/initdb" -D "$PGDATA" -U "$(id -un)" -A trust -E UTF8 >/tmp/pg-initdb.log 2>&1; then
          OK "fresh cluster initialized at .localdb/pgdata"
          if "$PG_BIN_DIR/pg_ctl" -D "$PGDATA" -l /tmp/pg-server.log -w start >/dev/null 2>&1; then
            OK "local Postgres started"
          else
            ERR "could not start the fresh cluster — see /tmp/pg-server.log"
            note_problem
          fi
        else
          ERR "initdb failed — see /tmp/pg-initdb.log"
          note_problem
        fi
      fi

      if "$PG_BIN_DIR/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
        "$PG_BIN_DIR/psql" -h 127.0.0.1 -p 5432 -U "$(id -un)" -d postgres \
          -c "create database farmer360" >/dev/null 2>&1 || true
        DATABASE_URL="postgresql://$(id -un)@127.0.0.1:5432/farmer360"
        export DATABASE_URL
        PG_READY=1
        OK "Postgres ready — DATABASE_URL=$DATABASE_URL"
      fi
    else
      WARN "no Postgres found — the app will use its embedded PGLite database (resets on restart)"
    fi
    ;;
  *)
    WARN "DATABASE_URL is set but is not a postgres:// URL — the app will use its embedded PGLite database"
    ;;
esac

if [ "$PG_READY" = 1 ]; then
  LOG "applying database migrations…"
  if npm run db:migrate >/tmp/run-migrate.log 2>&1; then
    OK "migrations applied"
  else
    ERR "migrations failed — see /tmp/run-migrate.log (the app may still boot on PGLite)"
    tail -n 15 /tmp/run-migrate.log 2>/dev/null | sed 's/^/         /'
    note_problem
  fi
fi

# ── 3. Build check: scan for errors, report them, NEVER stop here ───────────
LOG "running build check (errors are reported, not fatal)…"
BUILD_RC=0
npm run build >/tmp/run-build.log 2>&1 || BUILD_RC=$?

if [ "$BUILD_RC" = 0 ]; then
  OK "build check passed — no errors found"
else
  ERR "build check FAILED (exit code $BUILD_RC) — errors below; starting the dev server anyway"
  note_problem
  echo "--------------------------------------------------------------"
  grep -nEi "error|fail" /tmp/run-build.log | head -n 25 | sed 's/^/         /' || true
  echo "        … full build log: /tmp/run-build.log"
  echo "--------------------------------------------------------------"
fi

# ── 4. Summary + start the dev server (foreground) ──────────────────────────
echo "=============================================================="
if [ "$PROBLEMS" = 0 ]; then
  echo " [run] all checks passed — starting Farmer 360"
else
  echo " [run] $PROBLEMS check(s) reported problems above — starting anyway"
fi
echo " app:      http://localhost:8080"
echo " dev log:  the terminal you are in (Ctrl+C stops the server)"
echo "=============================================================="

exec npm run dev
