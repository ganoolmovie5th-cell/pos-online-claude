import { test, Page } from "@playwright/test";

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
      rest.push(`${r.status()} ${r.url().split("/rest/v1/")[1]?.split("?")[0]} -> ${b.slice(0, 150)}`);
    }
  });
});

test("kategori, kasbon, void, pengaturan, laporan", async ({ page }) => {
  test.setTimeout(150000);
  await login(page);

  // A) Kategori (insert kecil, cek RLS beres di tabel lain)
  await go(page, "/dashboard/produk");
  const cat = "QAcat" + Date.now();
  await page.getByPlaceholder("Kategori baru").fill(cat);
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await page.waitForTimeout(2000);
  const prodBody = await page.locator("body").innerText();
  console.log("[A] kategori tersimpan:", prodBody.includes(cat));

  // B) Pelanggan: tambah 1
  await go(page, "/dashboard/pelanggan");
  const cust = "QAcust" + Date.now();
  await page.getByPlaceholder("Nama pelanggan").fill(cust);
  await page.getByRole("button", { name: "Tambah" }).click();
  await page.waitForTimeout(2000);
  const custBody = await page.locator("body").innerText();
  console.log("[B] pelanggan tersimpan:", custBody.includes(cust));

  // C) Pengaturan: ubah pajak lalu simpan
  await go(page, "/dashboard/pengaturan");
  await page.waitForTimeout(1000);
  const taxInput = page.locator('input[type="number"]').first();
  await taxInput.fill("10");
  await page.getByRole("button", { name: "Simpan" }).click();
  await page.waitForTimeout(2000);
  const setBody = await page.locator("body").innerText();
  console.log("[C] pengaturan simpan:", setBody.includes("Tersimpan"));

  // D) Voucher: buat
  await go(page, "/dashboard/voucher");
  await page.getByPlaceholder("HEMAT10").fill("QA" + (Date.now() % 100000));
  await page.locator('input[type="number"]').first().fill("5000");
  await page.getByRole("button", { name: "Buat" }).click();
  await page.waitForTimeout(2000);
  const vBody = await page.locator("body").innerText();
  console.log("[D] voucher dibuat:", vBody.includes("Aktif"));

  // E) Void transaksi terbaru (uji void_sale RPC)
  await go(page, "/dashboard/transaksi");
  await page.waitForTimeout(1500);
  page.on("dialog", (d) => d.accept()); // konfirmasi void
  const voidBtn = page.getByRole("button", { name: "Void" }).first();
  if (await voidBtn.count() > 0) {
    await voidBtn.click();
    await page.waitForTimeout(3000);
    const txBody = await page.locator("body").innerText();
    console.log("[E] setelah void ada 'Dibatalkan':", txBody.includes("Dibatalkan"));
  } else {
    console.log("[E] tak ada tombol Void (tak ada transaksi completed)");
  }

  // F) Laporan tampil
  await go(page, "/dashboard/laporan");
  await page.waitForTimeout(2000);
  const repBody = await page.locator("body").innerText();
  console.log("[F] laporan ada 'Laba':", repBody.includes("Laba"));

  console.log("=== REST 4xx ERRORS ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});
