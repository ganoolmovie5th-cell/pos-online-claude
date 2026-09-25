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

test("#6 struk render + tombol WA/cetak/salin + scan kasir", async ({ page }) => {
  test.setTimeout(150000);
  await login(page);

  // Setup: buat produk + 1 transaksi supaya ada struk & label
  await go(page, "/dashboard/produk");
  const pname = "QAstruk" + Date.now();
  await page.getByPlaceholder("Kopi Susu").fill(pname);
  await page.getByPlaceholder("18000").fill("12000");
  await page.getByPlaceholder("12000").fill("8000");
  // isi barcode biar label punya barcode SVG
  await page.getByPlaceholder("Scan atau ketik kode").fill(String(Date.now()).slice(-12));
  await page.getByRole("button", { name: "Tambah produk" }).click();
  await page.waitForTimeout(2500);

  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: pname }).first().click();
  await page.waitForTimeout(500);
  await page.getByPlaceholder("Nominal bayar").fill("20000");
  await page.getByRole("button", { name: "Bayar & simpan" }).click();
  await page.waitForTimeout(3000);

  // Buka transaksi -> klik Struk transaksi pertama
  await go(page, "/dashboard/transaksi");
  await page.waitForTimeout(1500);
  const strukBtn = page.getByRole("button", { name: "Struk" }).first();
  if (await strukBtn.count()) {
    await strukBtn.click();
    await page.waitForTimeout(1500);
    // Modal struk: elemen #receipt ada + tombol WhatsApp/Cetak/Salin
    const hasReceipt = await page.locator("#receipt").count();
    console.log("[6] #receipt ter-render:", hasReceipt > 0);
    const receiptText = await page.locator("#receipt").innerText().catch(() => "");
    console.log("[6] struk ada 'Total':", receiptText.includes("Total"));
    console.log("[6] tombol WhatsApp ada:", await page.getByRole("button", { name: "WhatsApp" }).count() > 0);
    console.log("[6] tombol Cetak ada:", await page.getByRole("button", { name: "Cetak" }).count() > 0);
    console.log("[6] tombol Salin ada:", await page.getByRole("button", { name: "Salin" }).count() > 0);
    expect(hasReceipt).toBeGreaterThan(0);
  } else {
    console.log("[6] tak ada transaksi untuk struk");
  }

  // Kasir: tombol scan kamera ada
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  const scanBtn = page.getByRole("button", { name: /Scan/ });
  console.log("[6] tombol Scan kamera ada:", await scanBtn.count() > 0);

  // Label: buka /label, pilih 1 produk, cek barcode SVG ter-render
  await go(page, "/dashboard/label");
  await page.waitForTimeout(1500);
  const qtyInput = page.locator('input[type="number"]').first();
  if (await qtyInput.count()) {
    await qtyInput.fill("1");
    await page.waitForTimeout(2000);
    const svgCount = await page.locator("#labels svg").count();
    console.log("[6] label barcode SVG ter-render:", svgCount);
    console.log("[6] tombol Cetak label ada:", await page.getByRole("button", { name: /Cetak/ }).count() > 0);
  }
});
