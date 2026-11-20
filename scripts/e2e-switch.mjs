// E2E: demo login → desk → account switcher (sidebar card + top menu + mobile sheet).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://localhost:8080";
const SHOTS = "/tmp/e2e-shots";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (err) => console.log("[pageerror]", String(err).slice(0, 300)));

const log = (msg) => console.log(msg);

// 1. Sign in as the farmer via the login form.
await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1500);
await page.fill("#login-email", "farmer.demo@akatale.ug");
await page.fill("#login-password", "Harvest#2026");
await page.click("button[type=submit]");
await page.waitForURL("**/desk", { timeout: 30000 });
await page.waitForTimeout(2500);
const farmerName = await page.textContent("text=Amina Nakato", { timeout: 15000 }).catch(() => null);
log(`1. farmer sign-in → desk: ${farmerName ? "profile visible" : "PROFILE MISSING"}`);
await page.screenshot({ path: `${SHOTS}/01-desk-farmer.png` });

// 2. Workspace card dropdown (sidebar).
await page.click('button[aria-label="Workspace and account options"]');
await page.waitForTimeout(700);
const switchLabel = await page.textContent("text=Switch account").catch(() => null);
log(`2. workspace dropdown open: ${switchLabel ? "switch list present" : "MISSING"}`);
await page.screenshot({ path: `${SHOTS}/02-workspace-dropdown.png` });

// 3. Switch to the SACCO officer via the dropdown.
await page.click('text=Grace Namuli');
try {
  await page.waitForSelector("text=Switching to Grace Namuli", { timeout: 5000 });
  await page.screenshot({ path: `${SHOTS}/03-switch-overlay.png` });
  log("3. switch overlay animation shown");
} catch {
  log("3. overlay not captured (switch may have been fast)");
}
await page.waitForURL("**/desk", { timeout: 30000 });
await page.waitForTimeout(2500);
const graceVisible = await page.textContent("text=Grace Namuli", { timeout: 15000 }).catch(() => null);
const roleBadge = await page.textContent("text=SACCO officer", { timeout: 5000 }).catch(() => null);
log(`4. switched to Grace: ${graceVisible ? "name visible" : "MISSING"} · role ${roleBadge ? "SACCO officer" : "MISSING"}`);
await page.screenshot({ path: `${SHOTS}/04-desk-officer.png` });

// 5. Top-bar user menu: Add account sits directly above Sign out.
await page.click('button[aria-label="Account menu"]');
await page.waitForTimeout(600);
const addAccount = await page.textContent("text=Add account").catch(() => null);
log(`5. top-bar menu: Add account ${addAccount ? "present" : "MISSING"}`);
await page.screenshot({ path: `${SHOTS}/05-user-menu.png` });
await page.keyboard.press("Escape");

// 6. Officer-only page renders with real data (SACCO book).
await page.goto(`${BASE}/desk/sacco`, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOTS}/06-sacco-officer.png` });
log("6. SACCO book loaded for officer");

// 7. Mobile: bottom nav Account tab opens the switcher sheet.
const mobile = await browser.newPage({ viewport: { width: 375, height: 740 } });
await mobile.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
await mobile.waitForTimeout(1200);
await mobile.fill("#login-email", "officer.demo@akatale.ug");
await mobile.fill("#login-password", "Sacco#2026");
await mobile.click("button[type=submit]");
await mobile.waitForURL("**/desk**", { timeout: 30000 });
await mobile.waitForTimeout(2000);
await mobile.click("nav[aria-label='Desk sections'] button:has-text('Account')");
await mobile.waitForTimeout(800);
const sheetSwitch = await mobile.textContent("text=Switch account").catch(() => null);
log(`7. mobile account sheet: ${sheetSwitch ? "switch list present" : "MISSING"}`);
await mobile.screenshot({ path: `${SHOTS}/07-mobile-account-sheet.png` });

await browser.close();
log("done");
