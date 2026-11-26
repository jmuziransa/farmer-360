#!/usr/bin/env node
/**
 * Farmer 360 — multi-database sync (`npm run db:sync`).
 *
 * Connects to TWO real Postgres databases and makes the TARGET a copy of the
 * SOURCE: pending migrations are applied to the target first, then every
 * public table is emptied and refilled with the source rows (foreign-key
 * order, primary keys preserved, sequences re-based). This is the
 * "circumstances where you connect to more than one database" tool:
 *
 *   develop on the Docker Postgres  →  sync into Supabase for production
 *   back up Supabase                →  sync into a local database
 *   move between machines           →  sync local → hosted → local
 *
 * URLs come from `.env` (or the real environment), or --from/--to:
 *
 *   npm run db:sync                        # SYNC_SOURCE_URL → SYNC_TARGET_URL
 *                                          # (source falls back to DATABASE_URL)
 *   npm run db:sync -- --dry-run           # show the plan, change nothing
 *   npm run db:sync -- --from URL --to URL # explicit one-off
 *
 * The TARGET is overwritten table-by-table. --dry-run first is cheap.
 * The embedded PGLite fallback cannot be a side (it lives in memory inside
 * the app process); both URLs must be real Postgres servers.
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { pendingMigrations } from "./migration-plan.mjs";
import { loadDotenvIntoProcess } from "./load-dotenv.mjs";

loadDotenvIntoProcess();

// ── CLI + URL resolution ─────────────────────────────────────────────────────
function flag(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}
const DRY_RUN = process.argv.includes("--dry-run");

function usableUrl(raw) {
  const url = raw?.trim();
  return url && /^postgres(ql)?:\/\//.test(url) ? url : undefined;
}

const sourceUrl = usableUrl(
  flag("--from") ?? process.env.SYNC_SOURCE_URL ?? process.env.DATABASE_URL,
);
const targetUrl = usableUrl(flag("--to") ?? process.env.SYNC_TARGET_URL);

/** `postgresql://user:pass@host:port/db` → `postgresql://user:***@host:port/db` */
function maskUrl(url) {
  return url.replace(/(postgresql?:\/\/[^:]+:)[^@]+@/, "$1***@");
}

/** Stable identity for "same database" detection. */
function urlIdentity(url) {
  const u = new URL(url);
  return `${u.username}@${u.hostname}:${u.port || "5432"}${u.pathname}`;
}

if (!sourceUrl || !targetUrl) {
  console.error("[db:sync] need a source and a target database.");
  console.error("           set SYNC_SOURCE_URL + SYNC_TARGET_URL in .env, or pass --from/--to");
  console.error("           (source falls back to DATABASE_URL when unset)");
  process.exit(2);
}
if (urlIdentity(sourceUrl) === urlIdentity(targetUrl)) {
  console.error("[db:sync] source and target are the same database — nothing to do.");
  process.exit(2);
}

const log = (msg) => console.log(`[db:sync] ${msg}`);
log(`source: ${maskUrl(sourceUrl)}`);
log(`target: ${maskUrl(targetUrl)}${DRY_RUN ? "  (dry-run — nothing will be written)" : ""}`);

// ── Connections ───────────────────────────────────────────────────────────────
const source = new pg.Pool({ connectionString: sourceUrl, max: 1 });
const target = new pg.Pool({ connectionString: targetUrl, max: 1 });
let failures = 0;

async function main() {
  // 1. Both sides must be reachable before anything is touched.
  await source.query("select 1");
  await target.query("select 1");
  log("both databases reachable");

  // 2. Apply pending migrations to the TARGET so its schema can hold the data.
  await migrateTarget();

  // 3. Which tables exist on the SOURCE (the authority for what to copy)?
  const tables = (
    await source.query(
      `select c.relname as name
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
          and c.relname <> '_migrations'
        order by c.relname`,
    )
  ).rows.map((r) => r.name);
  if (tables.length === 0) {
    log("source has no tables — nothing to sync.");
    return;
  }

  // 4. Foreign-key graph from the SOURCE, so parents are inserted before children.
  const order = await tableOrder(tables);

  // 5. Copy (or just report, in dry-run).
  const report = [];
  for (const table of order) {
    const cols = (
      await source.query(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = $1
          order by ordinal_position`,
        [table],
      )
    ).rows.map((r) => r.column_name);
    const { rows } = await source.query(`select count(*)::int as n from "${table}"`);
    const n = rows[0].n;
    if (DRY_RUN) {
      report.push([table, n, "would copy"]);
      continue;
    }
    try {
      await copyTable(table, cols, n);
      report.push([table, n, "copied"]);
    } catch (err) {
      failures += 1;
      report.push([table, n, `FAILED: ${err.message}`]);
    }
  }

  // 6. Re-base sequences on the target so new inserts do not collide.
  if (!DRY_RUN) await fixSequences();

  // 7. Summary.
  const width = Math.max(...report.map(([t]) => t.length));
  for (const [table, n, status] of report) {
    console.log(`         ${table.padEnd(width)}  ${String(n).padStart(7)} rows  ${status}`);
  }
  if (failures > 0) {
    console.error(`[db:sync] ${failures} table(s) failed — see messages above.`);
    process.exitCode = 1;
  } else {
    log(DRY_RUN ? "dry-run complete — run without --dry-run to apply." : "sync complete.");
  }
}

/** Apply pending migrations/ files to the target (same rules as migrate.mjs). */
async function migrateTarget() {
  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  const entries = await readdir(migrationsDir);
  await target.query(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const applied = new Set(
    (await target.query("select name from _migrations")).rows.map((r) => r.name),
  );
  const pending = pendingMigrations(entries, [...applied]);
  for (const { name } of pending) {
    const text = await readFile(join(migrationsDir, name), "utf8");
    const client = await target.connect();
    try {
      await client.query("begin");
      await client.query(text);
      await client.query("insert into _migrations (name) values ($1)", [name]);
      await client.query("commit");
      log(`applied migration ${name} to target`);
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw new Error(`target migration ${name} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
}

/** Topological order (parents first). Cycles are broken alphabetically. */
async function tableOrder(tables) {
  const set = new Set(tables);
  const parents = new Map(tables.map((t) => [t, new Set()]));
  const { rows } = await source.query(
    `select c.relname as child, p.relname as parent
       from pg_constraint f
       join pg_class c on c.oid = f.conrelid
       join pg_namespace cn on cn.oid = c.relnamespace
       join pg_class p on p.oid = f.confrelid
       join pg_namespace pn on pn.oid = p.relnamespace
      where f.contype = 'f' and cn.nspname = 'public' and pn.nspname = 'public'`,
  );
  for (const { child, parent } of rows) {
    if (set.has(child) && set.has(parent) && child !== parent) {
      parents.get(child).add(parent);
    }
  }
  const ordered = [];
  const done = new Set();
  const visiting = new Set();
  const visit = (t) => {
    if (done.has(t)) return;
    if (visiting.has(t)) return; // cycle — break it deterministically
    visiting.add(t);
    for (const p of [...parents.get(t)].sort()) visit(p);
    visiting.delete(t);
    done.add(t);
    ordered.push(t);
  };
  for (const t of [...tables].sort()) visit(t);
  return ordered;
}

/** Empty the target table and refill it from the source, in batches. */
async function copyTable(table, cols, expectedRows) {
  const quoted = `"${table}"`;
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const client = await target.connect();
  try {
    await client.query("begin");
    await client.query(`delete from ${quoted}`);
    if (expectedRows > 0 && cols.length > 0) {
      // 65535 is Postgres' parameter limit — size batches to stay under it.
      const chunkSize = Math.max(1, Math.floor(60000 / cols.length));
      const stream = await source.connect();
      try {
        const res = await stream.query(`select ${colList} from ${quoted}`);
        for (let i = 0; i < res.rows.length; i += chunkSize) {
          const chunk = res.rows.slice(i, i + chunkSize);
          const values = [];
          const placeholders = chunk
            .map((row) => {
              const ph = cols.map((c) => {
                values.push(row[c]);
                return `$${values.length}`;
              });
              return `(${ph.join(", ")})`;
            })
            .join(", ");
          await client.query(`insert into ${quoted} (${colList}) values ${placeholders}`, values);
        }
      } finally {
        stream.release();
      }
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** setval() every sequence owned by a column, so future inserts get fresh ids. */
async function fixSequences() {
  const { rows } = await target.query(
    `select s.relname as seq, t.relname as tbl, a.attname as col
       from pg_class s
       join pg_depend d on d.objid = s.oid and d.deptype = 'a'
       join pg_class t on t.oid = d.refobjid
       join pg_namespace n on n.oid = t.relnamespace
       join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
      where s.relkind = 'S' and n.nspname = 'public'`,
  );
  for (const { seq, tbl, col } of rows) {
    await target.query(
      `select setval('"${seq}"', coalesce((select max("${col}") from "${tbl}"), 1))`,
    );
  }
}

main()
  .catch((err) => {
    console.error("[db:sync] failed:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.end().catch(() => undefined);
    await target.end().catch(() => undefined);
  });
