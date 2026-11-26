# Akatale Farm360 — a recorded farm desk for Ugandan smallholders

Akatale Farm360 keeps a farmer's records — crops, livestock, poultry, produce, money and the
store ledger — side by side with a community marketplace, an order book, a SACCO (savings and
credit cooperative) and an AI agronomist. Produce is listed by farmers, approved by an
administrator before it goes live, ordered by buyers, and deducted from the store ledger when
an order is fulfilled. Every approval, rejection, disbursement and role change lands in an
audit trail.

The application is a full-stack TypeScript app built on **TanStack Start** (SSR + server
functions), **Tailwind CSS 4** with shadcn-style UI components, **Better Auth** for identity,
and a dual-mode SQL layer that runs against **Neon Postgres** in production and an embedded
**PGLite** database in local development. It deploys to **Vercel** via Nitro.

---

## Features

| Area | What it does |
| --- | --- |
| Farm records | Eleven record modules (crops, livestock, poultry, eggs, milk, tasks, diseases, soil, store, finance, budget) with per-farm isolation, search, archive/restore, pagination (10 per page) and CSV export. Money is stored as whole UGX. |
| Farm dashboard | Income / expense / net profit derived only from unarchived finance records — crop activities and market valuations never leak into the money view. |
| Store ledger | Append-only inventory movements with a SQL trigger that refuses negative balances and future dates. Fulfilling a marketplace order deducts the sold quantity automatically when stock allows. |
| Marketplace | Farmers submit produce (crop names suggested from the shared record catalog, with a live "in your store" availability hint and photo upload). Listings stay pending until an administrator approves them. |
| Orders | Buyers request orders; farmers accept, decline or fulfil them. |
| SACCO | Deposits and withdrawals in a ledger, loan applications, admin approval, officer disbursement and repayment tracking with outstanding-balance maths. |
| AI agronomist | Ask about crops, livestock, poultry, soil, pests, market or farm money. Provider-agnostic (xAI/Grok or any OpenAI-compatible endpoint), server-side key only, rate-limited, answers stored as history. Without a key the page says so plainly — it never fakes an answer. |
| Administration | Dashboard totals, produce/loan approval queue, member roles, recent-activity audit trail. |
| Public demo | The landing page shows a read-only snapshot of the seeded demo farm (no personal data, no individual sale amounts). |

## Demo accounts

Seeded on first load of the landing page (guarded by a database claim so concurrent visits
cannot double-seed):

| Role | Email | Password | Try |
| --- | --- | --- | --- |
| Admin | `jmuziransa@gmail.com` | `Akatale#2026` | Approvals, dashboard, roles, audit trail |
| Farmer | `farmer.demo@akatale.ug` | `Harvest#2026` | Farm records, store ledger, list produce, AI advice |
| Buyer | `buyer.demo@akatale.ug` | `Market#2026` | Browse live produce, place an order |
| SACCO officer | `officer.demo@akatale.ug` | `Sacco#2026` | Savings ledger, disburse loans, record repayments |

**Change these passwords before any real use** — they are printed on the public landing page
by design, because this is a demo.

## Architecture

```
src/
  routes/            TanStack Start file routes (/, /market, /login, /signup, /desk/*)
  components/        chrome (TopBar, Page, Card, inputs) + ui/ primitives
  lib/
    auth/            Better Auth wiring + the template auth middleware
    db.ts            dual-mode SQL client: Neon (pg) when DATABASE_URL is set, else PGLite
    market.functions.ts   profiles, listings, orders, loans, savings, seed, audit trail
    farm.functions.ts     farms, records, inventory, public demo snapshot, stock lookup
    advice.functions.ts   AI agronomist (OpenAI-compatible chat completions)
    farm-entry-rules.ts   entry validation, finance totals, stock maths (unit-tested)
    record-catalog.ts     shared crop/animal catalog (unit-tested)
    sacco-rules.ts        savings/loan/UGX parsing maths (unit-tested)
  start.ts absent    TanStack Start's default CSRF-protected entry is used
migrations/          ordered SQL schema, applied on build (Neon) and at startup (PGLite)
migrations/auth/     Better Auth schema source (copied verbatim into migrations/ — see
                     scripts/migration-plan.mjs for why the copy mechanism is safe)
scripts/             deploy migrator, auth invariant check, preview manager + their tests
```

Auth runs through this app's own Better Auth (`/api/auth/*`) with local email/password
enabled (`VITE_AUTH_ENABLED` in `.grok/app-env.json` is `"true"` in this app):

- **Every session is a real session** — sign in on `/login` (or create an account on
  `/signup`); every server function scopes its queries by the verified caller id.
- The four demo accounts are seeded automatically at server bootstrap, so the
  quick-fill accounts work the moment the server is up — on PGLite and on Postgres alike.
- The desk's account switcher (sidebar workspace card, user rows, top-bar menu and the
  mobile Account tab) signs you in as another persona in place; "Add account" opens the
  sign-in page for any other account.

## Getting started

Three shell entry points share one database bootstrap (`scripts/lib-db.sh`) and are
all safe to run with sudo — they re-execute as the normal user, because Postgres
(`initdb`, `postgres`) refuses to run as root:

```sh
./startup.sh       # fresh machine / Codespace: installs Postgres if missing, starts the
                   # database (DATABASE_URL from .env — Supabase/Neon/Docker — local
                   # cluster on 5432/5433, or the embedded PGLite fallback), starts
                   # the app in the background and verifies it responds on 0.0.0.0:8080
./run.sh           # daily dev run: dependency + build checks (report-only), database
                   # start/init + migrations, app in the foreground
./update.sh        # pulls the latest code (fast-forward), applies safe dependency
                   # updates (npm update) + full verification sweep (typecheck, lint,
                   # tests, build) — never starts the app
```

or, without any provisioning:

```sh
npm install
npm run dev        # http://0.0.0.0:8080 — data resets with the dev server (PGLite in memory)
```

Other commands:

```sh
npm run typecheck  # tsc --noEmit (strict)
npm test           # node --test: unit tests + template infrastructure tests
npm run build      # production build (also applies migrations to DATABASE_URL when set)
npm run preview    # serve the built output on 127.0.0.1:8081
npm run db:status  # report every configured database: reachable? migrations? rows?
```

## Configuration

| Variable | Where | Effect |
| --- | --- | --- |
| `DATABASE_URL` | `.env` (preferred) or server env | Switch from PGLite to a real Postgres — Supabase, Neon, a Docker container, anything `postgres://`. No code changes needed. |
| `SYNC_SOURCE_URL` / `SYNC_TARGET_URL` | `.env` | Optional second database for `npm run db:sync` (see Databases below). |
| `VITE_AUTH_ENABLED` | `.grok/app-env.json` locally, provider env on deploy | This app ships `"true"` (real email/password sign-in). `"false"` = shared dev user, only works without a database. |
| `XAI_API_KEY` | server env | Enables the AI agronomist through xAI's OpenAI-compatible API (default model `grok-4.3`). |
| `OPENAI_API_KEY` + `OPENAI_BASE_URL` | server env | Alternative provider, any OpenAI-compatible endpoint. Used only when `XAI_API_KEY` is absent. |
| `AI_MODEL` | server env | Override the default model for either provider. |

Without an AI key the advice page shows a clear "not configured" state; nothing is faked.

## Databases (`.env`, local Postgres, Supabase, and sync)

Database choice lives in **`.env`** (gitignored — copy `.env.example` to start).
Nothing is hardcoded; a variable exported in your shell always wins over the file.
Every entry point reads it: `npm run dev/build/preview`, `npm run db:migrate`,
`./run.sh`, `./startup.sh`, `./update.sh`, and the sync/status tools.

```sh
cp .env.example .env
# then edit .env, e.g. for the Docker Postgres created in the Codespace:
#   DATABASE_URL=postgresql://farmer:YOUR_PASSWORD@127.0.0.1:5432/farmer360
```

Resolution order — the first match wins:

1. **`DATABASE_URL`** (any real Postgres: Docker, Supabase, Neon, self-hosted).
   It is verified reachable before use; a dead `127.0.0.1` URL even gets one
   best-effort `docker start farmer360-db` attempt.
2. **Local Postgres** — `./run.sh` uses a server already on port 5432, or
   starts/initialises the app's own cluster in `.localdb/pgdata` (created as
   the normal user, never root), creating the `farmer360` database and
   applying migrations. `./startup.sh` additionally installs Postgres via
   apt/dnf/yum/apk when the machine has none.
3. **Embedded PGLite** — automatic fallback, zero setup, self-migrating, but
   data resets on every dev-server restart.

### Connecting to more than one database (sync)

Set an optional second database and copy everything between them — develop on
the Docker Postgres, then push into Supabase for production, or back the other
way:

```sh
# .env
#   SYNC_SOURCE_URL=postgresql://farmer:PASS@127.0.0.1:5432/farmer360
#   SYNC_TARGET_URL=postgresql://postgres.PROJ:PASS@aws-0-eu.pooler.supabase.com:6543/postgres

npm run db:status              # what is configured, what is reachable, row counts
npm run db:sync -- --dry-run   # preview: which tables, how many rows
npm run db:sync                # apply migrations to the target, then copy every
                               # table (foreign-key order, ids preserved,
                               # sequences rebased). The TARGET is overwritten.
```

The source defaults to `DATABASE_URL` when only `SYNC_TARGET_URL` is set;
`--from`/`--to` override everything for a one-off. Both sides must be real
Postgres servers — the in-memory PGLite fallback cannot be synced from outside
the app process.

## Deploying

1. Create a Neon database and copy its pooled connection string.
2. In Vercel, import the GitHub repository and set the environment variables:
   `DATABASE_URL`, `VITE_AUTH_ENABLED=true`, and (optionally) `XAI_API_KEY`.
3. Deploy — `npm run build` applies `migrations/*.sql` to Neon automatically on every deploy
   (`_migrations` table keeps track; re-runs are safe).
4. Sign in with a demo account, then immediately change the admin password under Account.

## Testing

`npm test` runs the repository harness (`node --test`):

- **Unit tests** cover the money and rules libraries through their public functions:
  `farm-entry-rules` (validation thresholds, whole-UGX rounding, finance totals, stock maths),
  `record-catalog` (crop/animal/unit selection) and `sacco-rules` (ledger balance, loan
  outstanding, UGX parsing).
- **Infrastructure tests** cover the build wrapper, migration bookkeeping, preview manager,
  PWA plugin and the auth invariant check — the contracts the deploy pipeline relies on.

CI (`.github/workflows/ci.yml`) runs typecheck, tests and the production build on every push
and pull request.
