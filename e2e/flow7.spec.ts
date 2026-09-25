import { test, expect, Page } from "@playwright/test";
import { BASE } from "./config";

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("kamu@bisnis.com").fill("admin@posonline.app");
  await page.getByPlaceholder("••••••••").fill("admin12345");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/auth/v1/token") && r.status() === 200, { timeout: 15000 }),
    page.getByRole("button", { name: "Masuk" }).click(),
  ]);
  await page.waitForTimeout(2000);
}
async function go(page: Page, path: string) {
  for (let i = 0; i < 5; i++) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(1500);
      if (page.url().includes(path)) return;
    } catch {}
    await page.waitForTimeout(1500);
  }
}
const rest: string[] = [];
test.beforeEach(async ({ page }) => {
  page.on("response", async (r) => {
    if (r.status() >= 400 && r.url().includes("supabase.co/rest")) {
      let b = ""; try { b = await r.text(); } catch {}
      rest.push(`${r.status()} ${r.url().split("/rest/v1/")[1]?.split("?")[0]} -> ${b.slice(0, 120)}`);
    }
  });
});

test("#8 admin tangguhkan lalu aktifkan bisnis (toggle, tanpa hapus)", async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await go(page, "/admin");
  await page.waitForTimeout(1500);

  // Cari baris bisnis yang BUKAN "Admin Platform" (hindari suspend diri sendiri)
  const rows = page.locator("table tbody tr");
  const count = await rows.count();
  console.log("[8] jumlah bisnis:", count);

  let target = -1;
  for (let i = 0; i < count; i++) {
    const txt = await rows.nth(i).innerText();
    if (!txt.includes("Admin Platform")) { target = i; break; }
  }
  if (target < 0) {
    console.log("[8] hanya ada bisnis Admin Platform, skip suspend (hindari kunci diri)");
    return;
  }

  const row = rows.nth(target);
  console.log("[8] target bisnis:", (await row.innerText()).split("\n")[0]);

  // Tangguhkan
  await row.getByRole("button", { name: "Tangguhkan" }).click();
  await page.waitForTimeout(2500);
  const afterSuspend = await rows.nth(target).innerText();
  console.log("[8] setelah tangguhkan ada 'Ditangguhkan':", afterSuspend.includes("Ditangguhkan"));
  expect(afterSuspend).toContain("Ditangguhkan");

  // Aktifkan lagi (pulihkan)
  await rows.nth(target).getByRole("button", { name: "Aktifkan" }).click();
  await page.waitForTimeout(2500);
  const afterActivate = await rows.nth(target).innerText();
  console.log("[8] setelah aktifkan ada 'Aktif':", afterActivate.includes("Aktif"));
  expect(afterActivate).toContain("Aktif");

  console.log("=== REST ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});
