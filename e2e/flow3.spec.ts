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

test("varian: buat produk+stok, buat varian, jual varian, cek stok turun", async ({ page }) => {
  test.setTimeout(180000);
  await login(page);

  // 1) Produk dengan stok dilacak
  await go(page, "/dashboard/produk");
  const pname = "QAvar" + Date.now();
  await page.getByPlaceholder("Kopi Susu").fill(pname);
  await page.getByPlaceholder("18000").fill("20000");
  await page.getByPlaceholder("12000").fill("12000");
  // aktifkan lacak stok + isi
  await page.getByRole("checkbox").first().check().catch(() => {});
  await page.getByPlaceholder("Jumlah").fill("50").catch(() => {});
  await page.getByRole("button", { name: "Tambah produk" }).click();
  await page.waitForTimeout(2500);
  console.log("[1] produk+stok dibuat:", (await page.locator("body").innerText()).includes(pname));

  // 2) Varian untuk produk itu
  await go(page, "/dashboard/varian");
  await page.waitForTimeout(1000);
  // pilih produk (select pertama)
  await page.locator("select").first().selectOption({ label: pname }).catch(async () => {
    // fallback: pilih by value terakhir
    const opts = await page.locator("select").first().locator("option").allInnerTexts();
    console.log("[2] opsi produk:", JSON.stringify(opts.slice(0, 5)));
  });
  await page.waitForTimeout(1000);
  await page.getByPlaceholder("M / Merah").fill("Large");
  await page.getByPlaceholder("0").first().fill("25000");
  // lacak stok varian
  const vChk = page.getByRole("checkbox").first();
  if (await vChk.count()) { await vChk.check().catch(() => {}); }
  await page.getByPlaceholder("Jumlah stok").fill("30").catch(() => {});
  await page.getByRole("button", { name: "Tambah varian" }).click();
  await page.waitForTimeout(2500);
  const vBody = await page.locator("body").innerText();
  console.log("[2] varian 'Large' tersimpan:", vBody.includes("Large"));
  console.log("[2] stok varian awal 30:", vBody.includes("30"));

  // 3) Jual varian di kasir
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  const card = page.locator("button", { hasText: pname }).first();
  if (await card.count()) {
    await card.click(); // buka modal varian
    await page.waitForTimeout(1000);
    const modalHasVarian = (await page.locator("body").innerText()).includes("Pilih varian");
    console.log("[3] modal pilih varian muncul:", modalHasVarian);
    const vBtn = page.locator("button", { hasText: "Large" }).first();
    if (await vBtn.count()) {
      await vBtn.click();
      await page.waitForTimeout(800);
      await page.getByPlaceholder("Nominal bayar").fill("30000");
      await page.getByRole("button", { name: "Bayar & simpan" }).click();
      await page.waitForTimeout(3000);
      console.log("[3] checkout varian:", (await page.locator("body").innerText()).includes("tersimpan") ? "TERSIMPAN" : "GAGAL");
    } else {
      console.log("[3] tombol varian Large tak ketemu di modal");
    }
  }

  // 4) Cek stok varian turun jadi 29
  await go(page, "/dashboard/varian");
  await page.waitForTimeout(1000);
  await page.locator("select").first().selectOption({ label: pname }).catch(() => {});
  await page.waitForTimeout(1500);
  const after = await page.locator("body").innerText();
  console.log("[4] stok varian jadi 29:", after.includes("29"), "| masih 30:", after.includes("30"));

  console.log("=== REST 4xx ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});
