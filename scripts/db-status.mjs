#!/usr/bin/env node
/**
 * Farmer 360 — database status report (`npm run db:status`).
 *
 * Shows every database the app is configured to talk to — the primary
 * (DATABASE_URL, or the PGLite fallback when unset) plus the optional
 * sync source/target — with reachability, applied migrations and row counts.
 * Read-only; exit code is always 0 (it is a report, not a check).
 *
 * URLs come from `.env` / `.env.local` / the environment, same as db:sync.
 */
import pg from "pg";
import { loadDotenvIntoProcess } from "./load-dotenv.mjs";

loadDotenvIntoProcess();

function usableUrl(raw) {
  const url = raw?.trim();
  return url && /^postgres(ql)?:\/\//.test(url) ? url : undefined;
}

function maskUrl(url) {
  return url.replace(/(postgresql?:\/\/[^:]+:)[^@]+@/, "$1***@");
}

const slots = [
  { label: "primary  (DATABASE_URL)", url: usableUrl(process.env.DATABASE_URL) },
  { label: "sync src (SYNC_SOURCE_URL)", url: usableUrl(process.env.SYNC_SOURCE_URL) },
  { label: "sync tgt (SYNC_TARGET_URL)", url: usableUrl(process.env.SYNC_TARGET_URL) },
].filter((s) => s.url);

console.log("Farmer 360 — database status");
if (slots.length === 0) {
  console.log("  no DATABASE_URL configured — the app runs on the embedded PGLite");
  console.log("  (in-memory, self-migrating, resets on every dev-server restart).");
  console.log("  To use a real Postgres: cp .env.example .env  and set DATABASE_URL.");
}

for (const { label, url } of slots) {
  const pool = new pg.Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  console.log(`\n  ${label}`);
  console.log(`    ${maskUrl(url)}`);
  try {
    const mig = (await pool.query("select count(*)::int as n from _migrations")).rows[0].n;
    const tables = (
      await pool.query(
        `select c.relname as name
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r'`,
      )
    ).rows;
    let rows = 0;
    if (tables.length > 0) {
      const counts = await Promise.all(
        tables.map((t) =>
          pool
            .query(`select count(*)::int as n from public."${t.name}"`)
            .then((r) => r.rows[0].n)
            .catch(() => 0),
        ),
      );
      rows = counts.reduce((a, b) => a + b, 0);
    }
    console.log(
      `    reachable — ${tables.length} table(s), ${mig} migration(s) applied, ~${rows} row(s) total`,
    );
  } catch (err) {
    console.log(`    NOT reachable — ${err?.message || err}`);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

if (slots.length > 0) {
  console.log("\n  copy data between databases with:  npm run db:sync [-- --dry-run first]");
}
