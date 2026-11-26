/**
 * Minimal, dependency-free `.env` loader shared by every Node entry point
 * (`with-app-env.mjs`, `migrate.mjs`, `db-sync.mjs`, `db-status.mjs`).
 *
 * Why not `dotenv` the package? The app must keep working in environments
 * where only the locked dependency tree is installed (CI, deploy hooks), and
 * the parsing rules we need are tiny: KEY=VALUE lines, `#` comments, optional
 * wrapping single/double quotes.
 *
 * Precedence (highest wins) — enforced by CALLERS spreading in this order:
 *   real process env  >  .env.local  >  .env
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Parse `.env` text into a flat object. Rules:
 *   - blank lines and lines starting with `#` are skipped
 *   - inline comments are NOT stripped (a `#` can be part of a password)
 *   - one wrapping pair of single or double quotes around the value is removed
 *   - malformed lines (no `=`, bad key characters) are skipped, not fatal
 */
export function parseDotenv(text) {
  const out = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!KEY_RE.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** The project root (this file lives in `<root>/scripts/`). */
export function dotenvRoot() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

/**
 * Read `.env` and `.env.local` from `root` (when present) into one object.
 * `.env.local` entries win over `.env` entries — this is the FILE-level
 * precedence; callers still put the real process env on top.
 */
export function readDotenv(root = dotenvRoot()) {
  const merged = {};
  for (const name of [".env", ".env.local"]) {
    try {
      Object.assign(merged, parseDotenv(readFileSync(join(root, name), "utf8")));
    } catch {
      // absent or unreadable — the next file (or nothing) applies
    }
  }
  return merged;
}

/**
 * Load `.env` / `.env.local` into `process.env` for keys that are not already
 * set — an exported shell variable always wins, matching dotenv semantics and
 * the shell twin of this logic (`load_dotenv` in lib-db.sh).
 *
 * Returns the file-level merged object (for logging).
 */
export function loadDotenvIntoProcess(root = dotenvRoot()) {
  const fromFile = readDotenv(root);
  for (const [key, value] of Object.entries(fromFile)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return fromFile;
}
