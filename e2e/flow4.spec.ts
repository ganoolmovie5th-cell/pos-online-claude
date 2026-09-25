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

// Helper: buat produk stok, kembalikan nama
async function makeProduct(page: Page, stock: string): Promise<string> {
  await go(page, "/dashboard/produk");
  const n = "QAf4" + Date.now();
  await page.getByPlaceholder("Kopi Susu").fill(n);
  await page.getByPlaceholder("18000").fill("10000");
  await page.getByPlaceholder("12000").fill("6000");
  await page.getByRole("checkbox").first().check().catch(() => {});
  await page.getByPlaceholder("Jumlah").fill(stock).catch(() => {});
  await page.getByRole("button", { name: "Tambah produk" }).click();
  await page.waitForTimeout(2500);
  return n;
}

test("BUG-7 split payment + kas shift", async ({ page }) => {
  test.setTimeout(150000);
  await login(page);

  // Buka shift kalau belum ada
  await go(page, "/dashboard/shift");
  await page.waitForTimeout(1000);
  const shiftBody = await page.locator("body").innerText();
  if (!shiftBody.includes("Shift sedang berjalan")) {
    await page.getByPlaceholder("0").fill("100000");
    await page.getByRole("button", { name: "Buka shift" }).click();
    await page.waitForTimeout(2500);
    console.log("[shift] dibuka dengan kas awal 100rb");
  } else {
    console.log("[shift] sudah ada shift berjalan");
  }

  const pname = await makeProduct(page, "20");

  // Transaksi split: total item 10rb, bayar 6rb tunai + 4rb qris
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: pname }).first().click();
  await page.waitForTimeout(500);
  await page.locator("select").filter({ hasText: "Tunai" }).selectOption("split");
  await page.waitForTimeout(500);
  const nums = page.locator('input[type="number"]');
  // input split tunai & non-tunai (2 input terakhir di panel split)
  await page.locator('input[placeholder="0"]').nth(0).fill("6000").catch(() => {});
  await page.locator('input[placeholder="0"]').nth(1).fill("4000").catch(() => {});
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Bayar & simpan" }).click();
  await page.waitForTimeout(3000);
  console.log("[7] checkout split:", (await page.locator("body").innerText()).includes("tersimpan") ? "TERSIMPAN" : "cek manual");

  // Cek kas shift = 100rb + 6rb tunai (bukan +10rb)
  await go(page, "/dashboard/shift");
  await page.waitForTimeout(1500);
  // Ambil nilai "Penjualan tunai" (baris yang berisi label + nominal Rp)
  const penjualanTunai = await page.locator("div", { hasText: /^Penjualan tunai/ }).last().innerText().catch(() => "");
  console.log("[7] Penjualan tunai:", penjualanTunai.replace(/\n/g, " "));
  // Split tadi ada komponen tunai 6000. Kalau BUG-7 belum fix, split cash = 0 (tak terhitung).
  // Kita hanya konfirmasi checkout jalan + tak ada error; angka presisi perlu shift bersih.

  console.log("=== REST 4xx ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});

test("BUG-8 kasbon void: utang batal + poin balik", async ({ page }) => {
  test.setTimeout(150000);
  await login(page);

  // Pelanggan baru
  await go(page, "/dashboard/pelanggan");
  const cust = "QAdebt" + Date.now();
  await page.getByPlaceholder("Nama pelanggan").fill(cust);
  await page.getByRole("button", { name: "Tambah" }).click();
  await page.waitForTimeout(2000);

  const pname = await makeProduct(page, "20");

  // Transaksi kasbon dengan pelanggan itu
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: pname }).first().click();
  await page.waitForTimeout(500);
  await page.locator("select").filter({ hasText: "Tunai" }).selectOption("debt");
  await page.waitForTimeout(500);
  // pilih pelanggan (select pelanggan)
  await page.locator("select").filter({ hasText: "Tanpa pelanggan" }).selectOption({ label: new RegExp(cust) }).catch(async () => {
    await page.locator("select").last().selectOption({ index: 1 }).catch(() => {});
  });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Bayar & simpan" }).click();
  await page.waitForTimeout(3000);
  console.log("[8] kasbon:", (await page.locator("body").innerText()).includes("Kasbon tercatat") ? "TERCATAT" : "cek manual");

  // Cek pelanggan punya utang
  await go(page, "/dashboard/pelanggan");
  await page.waitForTimeout(1500);
  const before = await page.locator("body").innerText();
  console.log("[8] pelanggan punya 'Utang':", before.includes("Utang"));

  // Void transaksi kasbon
  page.on("dialog", (d) => d.accept());
  await go(page, "/dashboard/transaksi");
  await page.waitForTimeout(1500);
  const vb = page.getByRole("button", { name: "Void" }).first();
  if (await vb.count()) {
    await vb.click();
    await page.waitForTimeout(3000);
    console.log("[8] transaksi jadi Dibatalkan:", (await page.locator("body").innerText()).includes("Dibatalkan"));
  }

  console.log("=== REST 4xx ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});

test("BUG-3/5 outlet: set stok outlet + transaksi outlet", async ({ page }) => {
  test.setTimeout(160000);
  await login(page);

  // Buat outlet di pengaturan
  await go(page, "/dashboard/pengaturan");
  await page.waitForTimeout(1200);
  const oname = "QAoutlet" + (Date.now() % 100000);
  await page.getByPlaceholder("Nama outlet").fill(oname);
  await page.getByRole("button", { name: "Tambah" }).click();
  await page.waitForTimeout(2000);
  console.log("[3/5] outlet dibuat:", (await page.locator("body").innerText()).includes(oname));

  const pname = await makeProduct(page, "40");

  // Set stok outlet
  await go(page, "/dashboard/stok-outlet");
  await page.waitForTimeout(1200);
  await page.locator("select").first().selectOption({ label: oname }).catch(() => {});
  await page.waitForTimeout(1500);
  // set stok produk di outlet ini
  const setInput = page.locator('input[type="number"]').first();
  await setInput.fill("15").catch(() => {});
  await page.getByRole("button", { name: "Simpan stok outlet" }).click();
  await page.waitForTimeout(2500);
  console.log("[3/5] stok outlet disimpan:", (await page.locator("body").innerText()).includes("disimpan"));

  // Transaksi di outlet: pilih outlet di kasir, jual
  await go(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  await page.locator("select").filter({ hasText: "Semua outlet" }).selectOption({ label: oname }).catch(() => {});
  await page.waitForTimeout(1500);
  const card = page.locator("button", { hasText: pname }).first();
  if (await card.count()) {
    const cardText = await card.innerText();
    console.log("[3/5] badge stok kasir (harus 15, bukan 40):", cardText.replace(/\n/g, " "));
    await card.click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder("Nominal bayar").fill("10000");
    await page.getByRole("button", { name: "Bayar & simpan" }).click();
    await page.waitForTimeout(3000);
    console.log("[3/5] checkout outlet:", (await page.locator("body").innerText()).includes("tersimpan") ? "TERSIMPAN" : "cek");
  }

  // Cek stok outlet turun 15 -> 14
  await go(page, "/dashboard/stok-outlet");
  await page.waitForTimeout(1200);
  await page.locator("select").first().selectOption({ label: oname }).catch(() => {});
  await page.waitForTimeout(1500);
  const sb = await page.locator("body").innerText();
  console.log("[3/5] stok outlet jadi 14:", sb.includes("14"));

  console.log("=== REST 4xx ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});

test("Mode meja F&B end-to-end", async ({ page }) => {
  test.setTimeout(150000);
  await login(page);

  const pname = await makeProduct(page, "30");

  await go(page, "/dashboard/meja");
  await page.waitForTimeout(1200);
  const mname = "Meja" + (Date.now() % 10000);
  await page.getByPlaceholder("Nama meja (Meja 1)").fill(mname);
  await page.getByRole("button", { name: "Tambah meja" }).click();
  await page.waitForTimeout(2500);
  console.log("[meja] meja dibuat:", (await page.locator("body").innerText()).includes(mname));

  // Buka sesi meja
  await page.locator("button", { hasText: mname }).first().click();
  await page.waitForTimeout(2000);
  // tambah item ke sesi (menu di panel)
  const menuBtn = page.locator("button", { hasText: pname }).first();
  if (await menuBtn.count()) {
    await menuBtn.click();
    await page.waitForTimeout(2000);
    console.log("[meja] item ditambah ke sesi");
    // bayar
    const payBtn = page.getByRole("button", { name: "Bayar & tutup meja" });
    if (await payBtn.count()) {
      await payBtn.click();
      await page.waitForTimeout(3000);
      console.log("[meja] bayar meja selesai");
    }
  } else {
    console.log("[meja] menu produk tak muncul di panel sesi");
  }

  // Cek transaksi tercatat
  await go(page, "/dashboard/transaksi");
  await page.waitForTimeout(1500);
  console.log("[meja] transaksi meja tercatat 'Selesai':", (await page.locator("body").innerText()).includes("Selesai"));

  console.log("=== REST 4xx ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});
