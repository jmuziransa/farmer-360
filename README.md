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

Auth has two modes, driven by `VITE_AUTH_ENABLED`:

- **Preview / development (`false`, the shipped default)** — server functions resolve a shared
  dev user (`dev-user`), who owns the seeded demo content; the whole desk is explorable without
  signing in.
- **Deployed (`true`, set by the platform or your Vercel env)** — real sessions through Better
  Auth; every server function scopes its queries by the verified caller id.

## Getting started

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
```

## Configuration

| Variable | Where | Effect |
| --- | --- | --- |
| `DATABASE_URL` | server env | Switch from PGLite to a real Postgres (e.g. Neon). No code changes needed. |
| `VITE_AUTH_ENABLED` | `.grok/app-env.json` locally, provider env on deploy | `false` = shared dev user; `true` = real sign-in. The deploy platform sets it to `true`. |
| `XAI_API_KEY` | server env | Enables the AI agronomist through xAI's OpenAI-compatible API (default model `grok-4.3`). |
| `OPENAI_API_KEY` + `OPENAI_BASE_URL` | server env | Alternative provider, any OpenAI-compatible endpoint. Used only when `XAI_API_KEY` is absent. |
| `AI_MODEL` | server env | Override the default model for either provider. |

Without an AI key the advice page shows a clear "not configured" state; nothing is faked.

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
