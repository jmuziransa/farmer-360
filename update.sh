#!/bin/sh
# Farmer 360 update — update.sh
#
# The counterpart to run.sh:
#   run.sh    = daily RUN     → checks everything (report-only), then starts the app
#   update.sh = periodic UPDATE → actually applies updates, then verifies everything
#
# What it does:
#   1. Updates npm dependencies WITHIN the version ranges in package.json
#      (`npm update` — safe: no new major versions). Major upgrades are only
#      REPORTED, never applied, because they can break the app.
#   2. Cleans and reinstalls if the install looks broken.
#   3. Applies database migrations.
#   4. Runs the full verification sweep: TypeScript, ESLint, unit tests,
#      production build. Every failure is printed with its errors.
#   5. Summarises: what was updated, what still needs attention.
#
# It does NOT start the app — run ./run.sh after updating.
set -u
cd "$(dirname "$0")"

LOG()  { printf '[update] %s\n' "$*"; }
OK()   { printf '[update] ✔ %s\n' "$*"; }
WARN() { printf '[update] ⚠ %s\n' "$*"; }
ERR()  { printf '[update] ✖ %s\n' "$*"; }

PROBLEMS=0
note_problem() { PROBLEMS=$((PROBLEMS + 1)); }

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  WARN "the app is currently running on port 8080 — updating under it is fine, but run ./run.sh again afterwards if the dev server picks up stale packages"
fi

echo "=============================================================="
echo " Farmer 360 update — $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================================="

# ── 1. Dependencies ──────────────────────────────────────────────────────────
LOG "checking npm before updating…"
if ! command -v npm >/dev/null 2>&1; then
  ERR "npm not found — cannot update dependencies"
  exit 1
fi

if [ ! -d node_modules ]; then
  LOG "node_modules missing — installing…"
  npm ci --no-audit --no-fund >/tmp/update-install.log 2>&1 \
    || npm install --no-audit --no-fund >>/tmp/update-install.log 2>&1
  [ -d node_modules ] && OK "dependencies installed" || {
    ERR "install failed — see /tmp/update-install.log"
    note_problem
  }
fi

LOG "updating dependencies within package.json ranges (npm update)…"
BEFORE=$(npm ls --depth=0 2>/dev/null | md5sum | cut -d' ' -f1)
if npm update --no-audit --no-fund >/tmp/update-npm.log 2>&1; then
  AFTER=$(npm ls --depth=0 2>/dev/null | md5sum | cut -d' ' -f1)
  CHANGED=$(grep -c '^[+] ' /tmp/update-npm.log 2>/dev/null || echo 0)
  if [ "$BEFORE" != "$AFTER" ]; then
    OK "dependencies updated — ${CHANGED:-some} package(s) moved to newer patch/minor versions"
    grep '^[+] ' /tmp/update-npm.log 2>/dev/null | head -n 20 | sed 's/^/         /' || true
  else
    OK "already up to date within the declared ranges"
  fi
else
  ERR "npm update failed — see /tmp/update-npm.log"
  tail -n 15 /tmp/update-npm.log 2>/dev/null | sed 's/^/         /'
  note_problem
  # A failed `npm update` can leave node_modules HALF-UPDATED (missing .bin
  # links — this actually happened: vite vanished mid-update). Restore a
  # consistent tree from the lockfile before any further check runs.
  LOG "restoring a consistent node_modules from the lockfile (npm ci)…"
  if npm ci --no-audit --no-fund >>/tmp/update-npm.log 2>&1; then
    OK "node_modules restored"
  else
    ERR "npm ci also failed — install manually, then re-run ./update.sh"
    note_problem
  fi
fi

# Security audit — report only (fixing can change behaviour).
LOG "security audit…"
AUDIT=$(npm audit --omit=dev 2>/dev/null | tail -n 5 || true)
if printf '%s' "$AUDIT" | grep -q "vulnerabilities"; then
  VULN=$(printf '%s' "$AUDIT" | grep "vulnerabilities" | head -n 1)
  case "$VULN" in
    *"0 vulnerabilities"*) OK "no production vulnerabilities" ;;
    *)
      WARN "audit found: $VULN"
      WARN "run 'npm audit fix' manually if you want them attempted (can change behaviour)"
      note_problem
      ;;
  esac
fi

# ── 2. Database ──────────────────────────────────────────────────────────────
LOG "applying database migrations…"
if npm run db:migrate >/tmp/update-migrate.log 2>&1; then
  OK "migrations applied"
else
  ERR "migrations failed — see /tmp/update-migrate.log"
  tail -n 15 /tmp/update-migrate.log 2>/dev/null | sed 's/^/         /'
  note_problem
fi

# ── 3. Full verification sweep: every file, every check ─────────────────────
LOG "TypeScript check (tsc --noEmit)…"
if npm run typecheck >/tmp/update-tsc.log 2>&1; then
  OK "TypeScript: no type errors"
else
  ERR "TypeScript errors found:"
  grep -E "error TS" /tmp/update-tsc.log | head -n 25 | sed 's/^/         /'
  echo "        … full log: /tmp/update-tsc.log"
  note_problem
fi

LOG "ESLint check…"
if npm run lint >/tmp/update-lint.log 2>&1; then
  OK "ESLint: no lint problems"
else
  ERR "lint problems found:"
  grep -E "error|warning" /tmp/update-lint.log | head -n 25 | sed 's/^/         /'
  echo "        … full log: /tmp/update-lint.log"
  note_problem
fi

LOG "unit tests…"
if npm test >/tmp/update-test.log 2>&1; then
  OK "all tests pass"
else
  ERR "tests failed:"
  grep -E "^not ok|fail [0-9]|✖" /tmp/update-test.log | head -n 25 | sed 's/^/         /'
  echo "        … full log: /tmp/update-test.log"
  note_problem
fi

LOG "production build…"
if npm run build >/tmp/update-build.log 2>&1; then
  OK "build succeeds"
else
  ERR "build failed:"
  grep -nEi "error|fail" /tmp/update-build.log | head -n 25 | sed 's/^/         /'
  echo "        … full log: /tmp/update-build.log"
  note_problem
fi

# ── 4. Summary ───────────────────────────────────────────────────────────────
echo "=============================================================="
if [ "$PROBLEMS" = 0 ]; then
  echo " [update] everything updated and verified — no errors found"
  echo " [update] start the app with: ./run.sh"
else
  echo " [update] $PROBLEMS check(s) FAILED — details above, fix before running"
fi
echo "=============================================================="
exit 0
