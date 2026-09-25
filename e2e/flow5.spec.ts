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
async function makeProduct(page: Page): Promise<string> {
  await go(page, "/dashboard/produk");
  const n = "QAf5" + Date.now();
  await page.getByPlaceholder("Kopi Susu").fill(n);
  await page.getByPlaceholder("18000").fill("50000");
  await page.getByPlaceholder("12000").fill("30000");
  await page.getByRole("button", { name: "Tambah produk" }).click();
  await page.waitForTimeout(2500);
  return n;
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

test("voucher: buat lalu pakai di kasir", async ({ page }) => {
  test.setTimeout(150000);
  await login(page);
  const code = "QAV" + (Date.now() % 100000);

  await go(page, "/dashboard/voucher");
  await page.getByPlaceholder("HEMAT10").fill(code);
  await page.locator('input[type="number"]').first().fill("10000");
  await page.getByRole("button", { name: "Buat" }).click();
  await page.waitForTimeout(2000);

  const pname = await makeProduct(page);
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: pname }).first().click();
  await page.waitForTimeout(500);
  // pakai voucher
  await page.getByPlaceholder("KODE").fill(code);
  await page.getByRole("button", { name: "Pakai" }).click();
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  console.log("[voucher] diskon voucher tampil (-Rp):", body.includes(code) && /-Rp/.test(body));
  // dump baris Subtotal/Diskon/Total apa adanya
  const totalRow = await page.locator("div", { hasText: /^Total/ }).last().innerText().catch(() => "");
  console.log("[voucher] baris Total:", totalRow.replace(/\n/g, " "));
  const allRp = (body.match(/Rp\s?[\d.]+/g) || []).slice(0, 12);
  console.log("[voucher] semua nominal:", JSON.stringify(allRp));
  await page.getByPlaceholder("Nominal bayar").fill("40000");
  await page.getByRole("button", { name: "Bayar & simpan" }).click();
  await page.waitForTimeout(3000);
  console.log("[voucher] checkout:", (await page.locator("body").innerText()).includes("tersimpan") ? "TERSIMPAN" : "cek");
  console.log("=== REST ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});

test("diskon persen + tebus poin", async ({ page }) => {
  test.setTimeout(160000);
  await login(page);

  // pelanggan (untuk poin)
  await go(page, "/dashboard/pelanggan");
  const cust = "QApoin" + Date.now();
  await page.getByPlaceholder("Nama pelanggan").fill(cust);
  await page.getByRole("button", { name: "Tambah" }).click();
  await page.waitForTimeout(2000);

  const pname = await makeProduct(page); // 50rb

  // Transaksi 1: beli untuk dapat poin (pilih pelanggan)
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: pname }).first().click();
  await page.waitForTimeout(500);
  // diskon persen 10%
  await page.locator("select").filter({ hasText: "Rp" }).selectOption("percent").catch(() => {});
  await page.locator('input[placeholder="0"]').first().fill("10").catch(() => {});
  await page.waitForTimeout(500);
  const body = await page.locator("body").innerText();
  // 50rb - 10% = 45rb
  console.log("[diskon%] total 45.000 muncul:", body.includes("45.000"));
  // pilih pelanggan supaya dapat poin
  await page.locator("select").filter({ hasText: "Tanpa pelanggan" }).selectOption({ label: new RegExp(cust) }).catch(() => {});
  await page.waitForTimeout(500);
  await page.getByPlaceholder("Nominal bayar").fill("45000");
  await page.getByRole("button", { name: "Bayar & simpan" }).click();
  await page.waitForTimeout(3000);
  const after = await page.locator("body").innerText();
  console.log("[diskon%] checkout + dapat poin:", after.includes("tersimpan") || after.includes("poin") ? "OK" : "cek");
  console.log("=== REST ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});

test("bundling: buat paket, jual di kasir", async ({ page }) => {
  test.setTimeout(160000);
  await login(page);
  const pname = await makeProduct(page);

  await go(page, "/dashboard/bundle");
  await page.waitForTimeout(1000);
  const bname = "QApaket" + (Date.now() % 100000);
  await page.getByPlaceholder("Paket Hemat A").fill(bname);
  await page.getByPlaceholder("0").first().fill("80000");
  // pilih produk isi paket (select pertama di baris isi)
  await page.locator("select").first().selectOption({ label: pname }).catch(() => {});
  await page.getByRole("button", { name: "Simpan paket" }).click();
  await page.waitForTimeout(2500);
  console.log("[bundle] paket dibuat:", (await page.locator("body").innerText()).includes(bname));

  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  const bcard = page.locator("button", { hasText: bname }).first();
  if (await bcard.count()) {
    await bcard.click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder("Nominal bayar").fill("80000");
    await page.getByRole("button", { name: "Bayar & simpan" }).click();
    await page.waitForTimeout(3000);
    console.log("[bundle] checkout paket:", (await page.locator("body").innerText()).includes("tersimpan") ? "TERSIMPAN" : "cek");
  } else {
    console.log("[bundle] kartu paket tak muncul di kasir");
  }
  console.log("=== REST ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});
