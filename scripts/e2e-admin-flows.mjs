// E2E 2: account creation (signup → profile → desk) + admin approval flow +
// the sidebar user-row switcher surface.
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

// 1. Create a brand-new buyer account (account creation + profile insert).
await page.goto(`${BASE}/signup`, { waitUntil: "networkidle", timeout: 45000 });
await page.fill("#su-name", "Sarah Kirabo");
await page.fill("#su-email", "sarah.kirabo@akatale.ug");
await page.fill("#su-password", "Market#2027");
await page.selectOption("#su-role", "buyer");
await page.fill("#su-district", "Jinja");
await page.click("button[type=submit]");
await page.waitForURL("**/desk", { timeout: 30000 });
await page.waitForTimeout(2500);
const sarahVisible = await page.textContent("text=Sarah Kirabo", { timeout: 15000 }).catch(() => null);
log(`1. new buyer account created + desk: ${sarahVisible ? "OK" : "MISSING"}`);
await page.screenshot({ path: `${SHOTS}/10-signup-desk.png` });

// 2. Switch to the admin via the sidebar user row dropdown.
await page.click('button[aria-label="Your account"]');
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS}/11-user-row-dropdown.png` });
await page.click('text=J. Muziransa');
try {
  await page.waitForSelector("text=Switching to J. Muziransa", { timeout: 5000 });
  log("2. user-row switch: overlay shown");
} catch {
  log("2. user-row switch: overlay not captured");
}
await page.waitForURL("**/desk", { timeout: 30000 });
await page.waitForTimeout(2500);
const adminVisible = await page.textContent("text=J. Muziransa", { timeout: 15000 }).catch(() => null);
log(`3. admin desk: ${adminVisible ? "OK" : "MISSING"}`);

// 3. Admin approval: approve the pending Robusta listing from the queue.
await page.goto(`${BASE}/desk/admin`, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SHOTS}/12-admin-queue.png` });
const approveButtons = page.locator('button:has-text("Approve")');
const count = await approveButtons.count();
log(`4. admin queue: ${count} Approve button(s) visible`);
if (count > 0) {
  await approveButtons.first().click();
  await page.waitForTimeout(1500);
  const toastText = await page.textContent("[data-sonner-toast]", { timeout: 8000 }).catch(() => "");
  log(`5. approval toast: ${toastText || "(none captured)"}`);
}
await page.screenshot({ path: `${SHOTS}/13-after-approve.png` });

// 4. Verify the approved listing is now live on the public market.
await page.goto(`${BASE}/market`, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1500);
const robusta = await page.textContent("text=Robusta Coffee", { timeout: 10000 }).catch(() => null);
log(`6. approved listing live on market: ${robusta ? "OK" : "MISSING"}`);
await page.screenshot({ path: `${SHOTS}/14-market-live.png` });

await browser.close();
log("done");
