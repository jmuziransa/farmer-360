#!/usr/bin/env node
// Signed-in journey: demo farmer logs in, opens Farm records, sees the seeded
// farm, module entries, finance cards and the stock ledger — then adds a real
// record and a stock movement to prove writes work end to end.
import { chromium } from "playwright";
import { existsSync } from "node:fs";

const BASE = process.env.SMOKE_URL ?? "http://127.0.0.1:8080";
const EMAIL = process.env.SMOKE_EMAIL ?? "farmer.demo@akatale.ug";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Harvest#2026";
const executablePath = ["/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome"].find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();
const errors = [];
const isIgnored = (t) => t.includes("grok.com") || t.includes("ERR_BLOCKED_BY_RESPONSE");
page.on("console", (m) => { if (m.type() === "error" && !isIgnored(m.text())) errors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

const step = async (name, fn) => {
  try { await fn(); console.log(`OK   ${name}`); }
  catch (err) { console.log(`FAIL ${name}: ${String(err).slice(0, 300)}`); process.exitCode = 1; }
};

await step("login as demo farmer", async () => {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/desk**", { timeout: 15000 });
});

await step("farm page shows seeded farm + finance cards", async () => {
  await page.goto(BASE + "/desk/farm", { waitUntil: "networkidle" });
  await page.waitForSelector("h1:has-text('Farm records')", { timeout: 15000 });
  const body = await page.innerText("body");
  if (!body.includes("Nakato Family Farm")) throw new Error("seeded farm missing");
  for (const expected of ["Farm income", "Farm expenses", "Net profit", "Store ledger", "Crops"]) {
    if (!body.includes(expected)) throw new Error(`missing "${expected}"`);
  }
});

await step("crops module lists seeded records", async () => {
  await page.click('button:has-text("Crops")');
  await page.waitForSelector("text=Longe 10H planted in the north field.", { timeout: 10000 });
});

await step("finance module shows income/expense entries", async () => {
  await page.click('button:has-text("Finance")');
  await page.waitForSelector("text=Maize sale to Nakifuma trader", { timeout: 10000 });
  const body = await page.innerText("body");
  if (!body.includes("UGX 936,000")) throw new Error("income amount not rendered");
});

await step("store ledger shows seeded items with balances", async () => {
  const body = await page.innerText("body");
  for (const expected of ["Maize grain", "Layer feed", "Urea fertiliser", "4 bags"]) {
    if (!body.includes(expected)) throw new Error(`missing "${expected}"`);
  }
});

await step("add a new crop record (write path)", async () => {
  await page.click('button:has-text("Crops")');
  await page.click('button:has-text("Add crops record")');
  // The entry form is controlled: the Details field is the visible text input
  // inside the form card below the module buttons.
  const form = page.locator("form").filter({ hasText: "Save record" }).first();
  await form.locator("input").nth(1).fill("Smoke-test coffee row.");
  await form.locator('button:has-text("Save record")').click();
  await page.waitForSelector("text=Record saved to your farm.", { timeout: 15000 });
});

await step("record a stock movement (ledger write path)", async () => {
  const row = page.locator("tr", { hasText: "Urea fertiliser" });
  await row.locator('button:has-text("Record movement")').click();
  const form = page.locator("form").filter({ hasText: "Record movement" }).last();
  await form.locator('select[name="direction"]').selectOption("out");
  await form.locator('input[name="quantity"]').fill("10");
  await form.locator('input[name="reason"]').fill("Smoke-test issue to the maize field");
  await form.locator('input[name="date"]').fill(new Date().toISOString().slice(0, 10));
  await form.locator('button:has-text("Record movement")').click();
  await page.waitForSelector("text=Stock movement recorded.", { timeout: 15000 });
});

await step("negative stock is refused by the ledger", async () => {
  const row = page.locator("tr", { hasText: "Urea fertiliser" });
  await row.locator('button:has-text("Record movement")').click();
  const form = page.locator("form").filter({ hasText: "Record movement" }).last();
  await form.locator('select[name="direction"]').selectOption("out");
  await form.locator('input[name="quantity"]').fill("99999");
  await form.locator('input[name="reason"]').fill("Should be refused");
  await form.locator('input[name="date"]').fill(new Date().toISOString().slice(0, 10));
  await form.locator('button:has-text("Record movement")').click();
  await page.waitForSelector("text=Not enough stock", { timeout: 15000 });
  await form.locator('button:has-text("Cancel")').click();
});

console.log(errors.length ? `CONSOLE ERRORS: ${errors.join(" | ")}` : "CONSOLE CLEAN");
await browser.close();
