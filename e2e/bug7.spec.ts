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

test("BUG-7 presisi: split cash masuk kas shift, non-tunai tidak", async ({ page }) => {
  test.setTimeout(180000);
  page.on("dialog", (d) => d.accept());
  await login(page);

  // 1) Tutup shift yang masih terbuka (kas akhir 0) supaya mulai bersih
  await go(page, "/dashboard/shift");
  await page.waitForTimeout(1000);
  for (let i = 0; i < 3; i++) {
    const bodyNow = await page.locator("body").innerText();
    if (!bodyNow.includes("Shift sedang berjalan")) break;
    await page.getByPlaceholder("0").fill("0");
    await page.getByRole("button", { name: "Tutup shift" }).click();
    await page.waitForTimeout(2500);
    await go(page, "/dashboard/shift");
    await page.waitForTimeout(1000);
  }

  // 2) Buka shift baru kas awal 0
  await page.getByPlaceholder("0").fill("0");
  await page.getByRole("button", { name: "Buka shift" }).click();
  await page.waitForTimeout(2500);
  console.log("[bug7] shift bersih dibuka (kas awal 0)");

  // 3) Produk harga 10rb
  await go(page, "/dashboard/produk");
  const pname = "QAb7" + Date.now();
  await page.getByPlaceholder("Kopi Susu").fill(pname);
  await page.getByPlaceholder("18000").fill("10000");
  await page.getByPlaceholder("12000").fill("6000");
  await page.getByRole("button", { name: "Tambah produk" }).click();
  await page.waitForTimeout(2500);

  // Pastikan pajak & service 0 supaya total = 10rb bersih (via pengaturan)
  await go(page, "/dashboard/pengaturan");
  await page.waitForTimeout(1200);
  const nums = page.locator('input[type="number"]');
  // urutan input number: [0]=pajak, [1]=service charge, [2]=rp/poin, [3]=nilai poin
  await nums.nth(0).fill("0");
  await nums.nth(1).fill("0");
  await page.getByRole("button", { name: "Simpan" }).click();
  await page.waitForTimeout(2000);

  // 4) Transaksi split: 6rb tunai + 4rb qris (total 10rb)
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: pname }).first().click();
  await page.waitForTimeout(500);
  await page.locator("select").filter({ hasText: "Tunai" }).selectOption("split");
  await page.waitForTimeout(800);
  // Input split ada di panel khusus (2 input .text-sm.text-right). Cash=[0], non-tunai=[1].
  const splitInputs = page.locator('input.text-right.text-sm[type="number"]');
  await splitInputs.nth(0).fill("6000");
  await splitInputs.nth(1).fill("4000");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Bayar & simpan" }).click();
  await page.waitForTimeout(3000);
  const kasirBody = await page.locator("body").innerText();
  console.log("[bug7] checkout split:", kasirBody.includes("tersimpan") ? "TERSIMPAN" : "GAGAL - " + kasirBody.slice(0, 120).replace(/\n/g, " "));

  // 5) Cek kas shift: tangkap response query sales shift untuk lihat shift_id + payments
  page.on("response", async (r) => {
    if (r.url().includes("/rest/v1/sales") && r.url().includes("shift_id")) {
      let b = ""; try { b = await r.text(); } catch {}
      console.log("[bug7] SALES QUERY:", r.url().split("/rest/v1/")[1]?.slice(0, 120), "->", b.slice(0, 300));
    }
  });
  await go(page, "/dashboard/shift");
  await page.waitForTimeout(2000);
  const penjualanTunai = await page.locator("div", { hasText: /^Penjualan tunai/ }).last().innerText().catch(() => "");
  const kasSeharusnya = await page.locator("div", { hasText: /^Kas seharusnya/ }).last().innerText().catch(() => "");
  console.log("[bug7] Penjualan tunai:", penjualanTunai.replace(/\n/g, " "));
  console.log("[bug7] Kas seharusnya:", kasSeharusnya.replace(/\n/g, " "));

  // Assertion: penjualan tunai = 6.000, bukan 10.000
  expect(penjualanTunai).toContain("6.000");
  expect(penjualanTunai).not.toContain("10.000");
  console.log("[bug7] PASS: split cash (6rb) masuk, non-tunai (4rb) tidak");
});
