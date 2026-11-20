#!/usr/bin/env node
// Local smoke check for this sandbox (no /workspace dir exists here, which the
// platform smoke script requires). Same checks: visible content on desktop and
// mobile, no console errors, plus the merged farm journey.
import { chromium } from "playwright";
import { existsSync } from "node:fs";

const BASE = process.env.SMOKE_URL ?? "http://127.0.0.1:8080";
const results = { pages: [], errors: [], journey: [] };

// This sandbox's Playwright download differs from its browser cache revision;
// use any present Chromium build explicitly.
const candidates = [
  process.env.SMOKE_BROWSER,
  "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome",
  "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-linux64/headless_shell",
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));

const browser = await chromium.launch(executablePath ? { executablePath } : {});

// The Grok platform branding injector (grok.com/grok-app-builder/extensions.js)
// is out of the app's control and blocked by this sandbox's network; ignore it.
const isIgnored = (text) => text.includes("grok.com") || text.includes("ERR_BLOCKED_BY_RESPONSE");

const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error" && !isIgnored(msg.text())) results.errors.push(msg.text().slice(0, 300));
});
page.on("pageerror", (err) => results.errors.push(String(err).slice(0, 300)));

async function visibleAt(name, path, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  p.on("console", (msg) => { if (msg.type() === "error" && !isIgnored(msg.text())) results.errors.push(`[${name}] ${msg.text().slice(0, 300)}`); });
  p.on("pageerror", (err) => results.errors.push(`[${name}] ${String(err).slice(0, 300)}`));
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  const text = await p.evaluate(() => document.body.innerText.trim());
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  results.pages.push({ name, path, chars: text.length, hasContent: text.length > 200, overflow, sample: text.slice(0, 120).replace(/\s+/g, " ") });
  await p.close();
}

// 1. Desktop + mobile render of the home page
await visibleAt("desktop-home", "/", 1280, 800);
await visibleAt("mobile-home", "/", 390, 844);

// 2. Marketplace public page
await visibleAt("market", "/market", 1280, 800);

// 3. Login page (auth on)
await visibleAt("login", "/login", 390, 844);

// 4. Farm page redirects to /login when signed out
await page.goto(BASE + "/desk/farm", { waitUntil: "networkidle" });
results.journey.push({ step: "farm-signed-out", url: page.url(), redirectedToLogin: page.url().includes("/login") });

await browser.close();

console.log(JSON.stringify(results, null, 1));
const bad = results.errors.length > 0 || results.pages.some((p) => !p.hasContent) || results.pages.some((p) => p.overflow);
process.exit(bad ? 1 : 0);
