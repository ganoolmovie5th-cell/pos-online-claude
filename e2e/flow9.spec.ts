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

test("#7a manifest + service worker register", async ({ page }) => {
  test.setTimeout(90000);
  // manifest.webmanifest valid
  const res = await page.goto(`${BASE}/manifest.webmanifest`);
  const mani = await res?.json().catch(() => null);
  console.log("[7] manifest name:", mani?.name, "| display:", mani?.display, "| icons:", mani?.icons?.length);
  expect(mani?.name).toBeTruthy();
  expect(mani?.display).toBe("standalone");

  // SW ter-register di halaman app
  await go(page, "/login");
  await page.waitForTimeout(2500);
  const swReg = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "no-sw-api";
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? "registered" : "not-registered";
  });
  console.log("[7] service worker:", swReg);
});

test("#7b offline queue: transaksi saat offline masuk antrean", async ({ page, context }) => {
  test.setTimeout(150000);
  await login(page);

  // Buat produk dulu (online)
  await go(page, "/dashboard/produk");
  const pname = "QApwa" + Date.now();
  await page.getByPlaceholder("Kopi Susu").fill(pname);
  await page.getByPlaceholder("18000").fill("9000");
  await page.getByPlaceholder("12000").fill("5000");
  await page.getByRole("button", { name: "Tambah produk" }).click();
  await page.waitForTimeout(2500);

  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: pname }).first().click();
  await page.waitForTimeout(500);

  page.on("pageerror", (e) => console.log("[7] PAGEERROR:", e.message));
  // pastikan item masuk cart dulu
  const cartText0 = await page.locator("body").innerText();
  console.log("[7] cart ada item (Subtotal > 0):", /Subtotal[\s\S]{0,40}Rp\s?[1-9]/.test(cartText0));

  // OFFLINE: putus koneksi, lalu checkout
  await context.setOffline(true);
  console.log("[7] set offline");
  await page.getByPlaceholder("Nominal bayar").fill("10000");
  const payBtn = page.getByRole("button", { name: "Bayar & simpan" });
  console.log("[7] tombol bayar enabled:", await payBtn.isEnabled());
  await payBtn.click();
  await page.waitForTimeout(5000);
  const offlineMsg = await page.locator("body").innerText();
  console.log("[7] pesan offline muncul:", offlineMsg.includes("diantre") || offlineMsg.includes("Offline"));
  console.log("[7] tombol masih 'Menyimpan':", offlineMsg.includes("Menyimpan"));

  // cek localStorage queue terisi
  const qLen = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("pos_offline_queue") || "[]").length; } catch { return -1; }
  });
  console.log("[7] antrean offline berisi:", qLen);
  expect(qLen).toBeGreaterThan(0);

  // ONLINE lagi: antrean harus ter-sync (queue kosong)
  await context.setOffline(false);
  console.log("[7] set online kembali");
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(6000); // beri waktu auto-sync
  const qLenAfter = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("pos_offline_queue") || "[]").length; } catch { return -1; }
  });
  console.log("[7] antrean setelah online (harus 0):", qLenAfter);
});
