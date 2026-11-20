#!/usr/bin/env node
/**
 * Ensure the PGLite WASM/DB assets land next to the externalized
 * `electric-sql__pglite.mjs` in the Vercel build output.
 *
 * Nitro externalizes `@electric-sql/pglite` into `_libs/` and rewrites its
 * data path to sit alongside the bundle, but the tracer can skip the two
 * large binary assets. This script copies them explicitly after `vite build`,
 * so the preview server and any locally-inspected build output always run.
 * Copying is a no-op when the tracer already did it.
 */
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".vercel", "output");

function findServerFuncLibs(dir, depth = 0) {
  if (depth > 6 || !existsSync(dir)) return null;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_libs") return full;
      const found = findServerFuncLibs(full, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const libs = findServerFuncLibs(join(output, "functions"));
if (!libs) {
  console.log("[pglite-assets] no _libs directory in the build output — nothing to do.");
  process.exit(0);
}

if (!existsSync(join(libs, "electric-sql__pglite.mjs"))) {
  console.log("[pglite-assets] pglite is not externalized in this build — nothing to do.");
  process.exit(0);
}

const pkgDist = join(root, "node_modules", "@electric-sql", "pglite", "dist");
const assetNames = ["pglite.wasm", "pglite.data", "initdb.wasm"];
for (const name of assetNames) {
  const target = join(libs, name);
  if (existsSync(target)) {
    console.log(`[pglite-assets] ${name} already present.`);
    continue;
  }
  const source = join(pkgDist, name);
  if (!existsSync(source)) {
    console.error(`[pglite-assets] missing ${name} in node_modules/@electric-sql/pglite/dist`);
    process.exitCode = 1;
    continue;
  }
  copyFileSync(source, target);
  console.log(`[pglite-assets] copied ${name} (${name === "pglite.data" ? "~6.3MB" : "~1MB"})`);
}
