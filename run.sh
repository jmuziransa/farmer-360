#!/bin/sh
# Farmer 360 daily run — run.sh
#
# One command to start the day:
#   1. Root guard — if run with sudo, re-executes as the normal user, because
#      Postgres (initdb, postgres) refuses to run as root.
#   2. Dependency check — installs node_modules if missing, then reports
#      packages that have newer versions available (npm outdated). Updates
#      are REPORTED, never applied automatically (use ./update.sh for that).
#   3. Postgres check — shared logic from scripts/lib-db.sh: uses DATABASE_URL
#      if set, otherwise uses/starts/initialises a local cluster on port 5432
#      (or 5433 if something else owns 5432) and applies migrations. It does
#      NOT install Postgres itself — run ./startup.sh on a machine that has
#      none. If no Postgres can be reached, the app falls back to its
#      embedded PGLite database.
#   4. Build check — runs a full production build purely as an error scan.
#      If it finds errors they are printed to the terminal, but the script
#      DOES NOT STOP: it always goes on to start the dev server.
#   5. Starts the app — `npm run dev` in the foreground on 0.0.0.0:8080.
#
# Never aborts on a check failure — every failure is reported and the run
# continues. Demo accounts and desk content seed themselves at app bootstrap.
set -u
cd "$(dirname "$0")"

LOG()  { printf '[run] %s\n' "$*"; }
OK()   { printf '[run] ✔ %s\n' "$*"; }
WARN() { printf '[run] ⚠ %s\n' "$*"; }
ERR()  { printf '[run] ✖ %s\n' "$*"; }
log()  { LOG "$@"; }

PROBLEMS=0
note_problem() { PROBLEMS=$((PROBLEMS + 1)); }

# ── 0. Root guard + already running? ─────────────────────────────────────────
. ./scripts/lib-db.sh
drop_root "$@"

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

# ── 2. Postgres: reachable, startable, migrated (shared lib-db.sh) ───────────
LOG "checking Postgres…"
resolve_database 0
PROBLEMS=$((PROBLEMS + DB_PROBLEMS))

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
