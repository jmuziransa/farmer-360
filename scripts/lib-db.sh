#!/bin/sh
# lib-db.sh — shared database bootstrap for run.sh / startup.sh / update.sh.
#
# Sourced, not executed. One copy of the logic so the three entry points can
# never drift apart again. Callers may define their own log()/OK()/ERR()
# helpers first — if they don't, a plain `[db]`-prefixed logger is used.
#
# Root guard: Postgres (initdb/postgres) refuses to run as root, and a
# sudo-run dev app leaves root-owned node_modules behind. Every entry script
# therefore calls drop_root "$@" first, which re-executes as the user who
# invoked sudo.
#
# Configuration (nothing is hardcoded — pick a database in `.env`):
#   DATABASE_URL     primary Postgres. Supabase / Neon / any hosted URL, or a
#                    local one, e.g. the Docker container farmer360-db:
#                    postgresql://farmer:PASSWORD@127.0.0.1:5432/farmer360
#   SYNC_SOURCE_URL  optional — database `npm run db:sync` copies FROM
#   SYNC_TARGET_URL  optional — database `npm run db:sync` copies TO
#   .env is gitignored; a real exported variable always beats the file.
#
# Resolution order (resolve_database):
#   1. DATABASE_URL (from env or .env) — verified reachable when psql exists;
#      a dead 127.0.0.1:5432 URL gets one `docker start farmer360-db` attempt.
#   2. A local Postgres — cluster under .localdb/ (initialised as the normal
#      user, NEVER root), port 5432 or 5433 when something else owns 5432.
#   3. (startup.sh only) Postgres installed via the system package manager.
#   4. None of the above — the app falls back to its embedded PGLite database.
#
# After this library is used the caller can rely on:
#   DATABASE_URL — set when a usable Postgres was found and migrated
#   PG_READY     — 1 when DATABASE_URL is live, 0 when the app must fall back
#                  to the embedded PGLite database
#   DB_PROBLEMS  — count of database problems seen (scripts report it)
#   DB_SUMMARY   — one-line description of the active database, for banners

# Fallback logger so the library also works when sourced standalone.
if ! command -v log >/dev/null 2>&1; then
  log() { printf '[db] %s\n' "$*"; }
fi

DB_PROBLEMS=0
db_problem() { DB_PROBLEMS=$((DB_PROBLEMS + 1)); }

# ── Root guard ───────────────────────────────────────────────────────────────
drop_root() {
  [ "$(id -u)" = "0" ] || return 0
  if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
    log "detected sudo — re-executing as '$SUDO_USER' (Postgres refuses to run as root)"
    if [ -n "${DATABASE_URL:-}" ]; then
      exec sudo -u "$SUDO_USER" env DATABASE_URL="$DATABASE_URL" sh "$0" "$@"
    fi
    exec sudo -u "$SUDO_USER" sh "$0" "$@"
  fi
  log "WARNING: running as root — initdb will refuse, so local Postgres is skipped"
}

# ── .env / .env.local loader (shell twin of scripts/load-dotenv.mjs) ─────────
# Sets keys that are not already in the environment, so an exported variable
# always wins. Keys are charset-validated before use; values are never eval'd.
# Load order .env.local THEN .env gives the precedence env > .env.local > .env.
load_dotenv_file() {
  [ -f "$1" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%"${line##*[!     ]}"}          # rtrim spaces/tabs
    case "$line" in ''|'#'*) continue ;; esac
    case "$line" in *=*) ;; *) continue ;; esac
    key=${line%%=*}
    key=${key#"${key%%[!         ]}*"}              # ltrim spaces/tabs
    case "$key" in
      *[!A-Za-z0-9_]*|'') continue ;;        # reject weird key names
    esac
    [ "$key" = "DATABASE_URL" ] && DOTENV_SET_DATABASE_URL=1
    val=${line#*=}
    val=${val#"${val%%[!         ]}*"}              # ltrim spaces/tabs
    case "$val" in
      '"'*) case "$val" in
              '"'*'"') val=${val#\"}; val=${val%\"} ;;
            esac ;;
      "'"*) case "$val" in
              "'"*"'") val=${val#\'}; val=${val%\'} ;;
            esac ;;
    esac
    # Only set when the environment does not already carry the key.
    if eval "[ -z \"\${$key+x}\" ]"; then
      export "$key=$val"
    fi
  done < "$1"
}

load_dotenv() {
  load_dotenv_file .env.local
  load_dotenv_file .env
}

# ── Locate an existing Postgres installation ─────────────────────────────────
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

# ── Install Postgres when the machine has none (startup.sh only) ─────────────
install_pg() {
  log "Postgres not found — installing it automatically"
  SUDO=""
  if [ "$(id -u)" != "0" ] && command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  fi
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -y >/dev/null 2>&1 || true
    $SUDO apt-get install -y postgresql
  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y postgresql-server postgresql
  elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y postgresql-server postgresql
  elif command -v apk >/dev/null 2>&1; then
    $SUDO apk add --no-cache postgresql
  else
    log "no supported package manager (apt/dnf/yum/apk) found"
    return 1
  fi
}

# ── Verify a DATABASE_URL actually accepts connections ───────────────────────
# Uses psql when available (PGCONNECT_TIMEOUT bounds the wait). Sets
# URL_OK=1 on success, plus URL_HOST/URL_PORT for reporting. When the URL
# points at localhost and nothing answers, one best-effort
# `docker start farmer360-db` is attempted before giving up.
verify_database_url() {
  URL="$1"
  URL_OK=0
  [ -n "$URL" ] || return 1

  # postgres://user:pass@host:port/db  ->  host + port (port defaults to 5432)
  URL_AUTH=$(printf '%s' "$URL" | sed -n 's|^postgres\(ql\)\{0,1\}://\([^/?]*\).*$|\2|p')
  URL_HOST=${URL_AUTH##*@}
  case "$URL_HOST" in
    *:*) URL_PORT=${URL_HOST##*:}; URL_HOST=${URL_HOST%%:*} ;;
    *)   URL_PORT=5432 ;;
  esac
  [ -n "$URL_HOST" ] || URL_HOST="(unparsed)"

  if command -v psql >/dev/null 2>&1; then
    if PGCONNECT_TIMEOUT=4 psql "$URL" -c "select 1" >/dev/null 2>&1; then
      URL_OK=1
    else
      # Dead localhost URL — try to revive the Docker Postgres container once.
      if [ "$URL_HOST" = "127.0.0.1" ] || [ "$URL_HOST" = "localhost" ]; then
        if command -v docker >/dev/null 2>&1 \
           && docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q '^farmer360-db$' \
           && ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^farmer360-db$'; then
          log "nothing answers on $URL_HOST:$URL_PORT — trying 'docker start farmer360-db'"
          docker start farmer360-db >/dev/null 2>&1 || true
          sleep 2
          if PGCONNECT_TIMEOUT=4 psql "$URL" -c "select 1" >/dev/null 2>&1; then
            URL_OK=1
          fi
        fi
      fi
    fi
  else
    # No psql to verify with — trust the URL; migrations will check it.
    URL_OK=1
  fi
  [ "$URL_OK" = 1 ]
}

# ── Role probe: first role that can connect to the server at 127.0.0.1:$2 ────
# Sets DB_ROLE on success. Local clusters we create use trust auth, so a
# successful connect proves the server is one we can use.
pick_role() {
  PSQL="$1"; PORT="$2"
  for role in farmer "$(id -un)" postgres; do
    if "$PSQL" -h 127.0.0.1 -p "$PORT" -U "$role" -d postgres -c "select 1" >/dev/null 2>&1; then
      DB_ROLE=$role
      return 0
    fi
  done
  return 1
}

# ── Start or initialise OUR cluster; export DATABASE_URL ─────────────────────
ensure_local_pg() {
  PSQL="$1"
  PG_BIN_DIR=$(dirname "$PSQL")
  PGDATA="$PWD/.localdb/pgdata"
  PGPORT=5432

  # Is a server already listening on 5432 — and can we connect to it?
  if "$PG_BIN_DIR/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    if pick_role "$PSQL" 5432; then
      log "using the Postgres already running on port 5432 (role '$DB_ROLE')"
      "$PSQL" -h 127.0.0.1 -p 5432 -U "$DB_ROLE" -d postgres \
        -c "create database farmer360" >/dev/null 2>&1 || true
      DATABASE_URL="postgresql://$DB_ROLE@127.0.0.1:5432/farmer360"
      export DATABASE_URL
      DB_SUMMARY="local Postgres on 127.0.0.1:5432/farmer360 (role '$DB_ROLE')"
      log "local Postgres ready — DATABASE_URL=$DATABASE_URL"
      return 0
    fi
    log "port 5432 is taken by a Postgres we cannot log in to (password-protected?)"
    log "         if that is your Docker 'farmer360-db', put its URL in .env as DATABASE_URL"
    log "         (see .env.example) — otherwise our own cluster will use port 5433"
    PGPORT=5433
  fi

  # Create the cluster directory if the machine has Postgres but no cluster.
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    log "initialising a fresh Postgres cluster in .localdb/pgdata"
    if ! "$PG_BIN_DIR/initdb" -D "$PGDATA" -U farmer -A trust -E utf8 --no-locale >/tmp/pg-init.log 2>&1; then
      log "initdb failed:"
      head -n 8 /tmp/pg-init.log 2>/dev/null | sed 's/^/         /'
      log "full log: /tmp/pg-init.log"
      db_problem
      return 1
    fi
    log "fresh cluster initialised"
  fi

  # Start it unless it is already serving on our port.
  if ! "$PG_BIN_DIR/pg_isready" -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1; then
    log "starting local Postgres on port $PGPORT"
    if ! "$PG_BIN_DIR/pg_ctl" -D "$PGDATA" -l /tmp/pg-server.log -w -o "-p $PGPORT" start >/dev/null 2>&1; then
      log "pg_ctl start failed:"
      head -n 8 /tmp/pg-server.log 2>/dev/null | sed 's/^/         /'
      log "full log: /tmp/pg-server.log"
      db_problem
      return 1
    fi
    log "local Postgres started"
  else
    log "local Postgres already running on port $PGPORT"
  fi

  if ! pick_role "$PSQL" "$PGPORT"; then
    log "server is up but no role connects — see /tmp/pg-server.log"
    db_problem
    return 1
  fi

  # Create the app database once (idempotent on every later start).
  "$PSQL" -h 127.0.0.1 -p "$PGPORT" -U "$DB_ROLE" -d postgres \
    -c "create database farmer360" >/dev/null 2>&1 || true
  DATABASE_URL="postgresql://$DB_ROLE@127.0.0.1:$PGPORT/farmer360"
  export DATABASE_URL
  DB_SUMMARY="local Postgres on 127.0.0.1:$PGPORT/farmer360 (own cluster in .localdb/)"
  log "local Postgres ready — DATABASE_URL=$DATABASE_URL"
}

# ── Full resolution: .env → hosted URL → local cluster → (install) → PGLite ──
# $1 = AUTO_INSTALL: 1 lets the script apt/dnf/yum/apk install Postgres
#      (startup.sh), 0 only reports when none is found (run.sh, update.sh).
resolve_database() {
  AUTO_INSTALL="${1:-0}"
  PG_READY=0
  DB_SUMMARY="embedded PGLite (in-app fallback, resets on restart)"

  load_dotenv

  case "${DATABASE_URL:-}" in
    postgres://* | postgresql://*)
      DOTENV_SET_DATABASE_URL="${DOTENV_SET_DATABASE_URL:-0}"
      if [ "$DOTENV_SET_DATABASE_URL" = 1 ]; then
        log "using DATABASE_URL from .env"
      else
        log "using DATABASE_URL (hosted Postgres)"
      fi
      if verify_database_url "$DATABASE_URL"; then
        PG_READY=1
        DB_SUMMARY="Postgres via DATABASE_URL ($URL_HOST:$URL_PORT)"
      else
        db_problem
        log "DATABASE_URL is set but the server does not accept connections:"
        log "         $URL_HOST:$URL_PORT — check the URL, the password, and that the server is up"
        log "         (Docker: docker start farmer360-db — Supabase/Neon: check the dashboard)"
        log "continuing without it — trying a local Postgres next"
        unset DATABASE_URL
      fi
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
    elif [ "$AUTO_INSTALL" = 1 ] && install_pg && PG_BIN=$(find_pg); then
      ensure_local_pg "$PG_BIN" && PG_READY=1
    elif [ "$AUTO_INSTALL" != 1 ]; then
      log "no local Postgres found — ./startup.sh installs it automatically if you want a real database"
    fi
  fi

  if [ "$PG_READY" = 1 ]; then
    log "applying database migrations…"
    if npm run db:migrate >/tmp/db-migrate.log 2>&1; then
      log "migrations applied"
    else
      log "migrations failed — falling back to the embedded PGLite database:"
      head -n 8 /tmp/db-migrate.log 2>/dev/null | sed 's/^/         /'
      log "full log: /tmp/db-migrate.log"
      unset DATABASE_URL
      PG_READY=0
      DB_SUMMARY="embedded PGLite (migration failed — see /tmp/db-migrate.log)"
      db_problem
    fi
  fi

  if [ "$PG_READY" = 0 ]; then
    log "no Postgres available — the app will use its embedded PGLite database (resets on restart)"
  fi
}
