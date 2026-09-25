import { test, expect, Page } from "@playwright/test";

const BASE = "https://pos-online-claude.vercel.app";

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("kamu@bisnis.com").fill("admin@posonline.app");
  await page.getByPlaceholder("••••••••").fill("admin12345");
  await page.getByRole("button", { name: "Masuk" }).click();
  // tunggu token, lalu navigasi manual (hindari artefak hard-nav headless)
  await page.waitForResponse((r) => r.url().includes("/auth/v1/token"), { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function gotoDash(page: Page, path: string) {
  // retry: kadang hard-nav bikin chrome-error, coba ulang goto
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 });
      if (!page.url().includes("chrome-error")) return;
    } catch {}
    await page.waitForTimeout(1000);
  }
}

const errors: string[] = [];

test.beforeEach(async ({ page }) => {
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("response", async (r) => {
    if (r.status() >= 400 && r.url().includes("supabase.co/rest")) {
      let b = ""; try { b = await r.text(); } catch {}
      console.log(`REST ${r.status()} ${r.url().split("/rest/v1/")[1]?.split("?")[0]} -> ${b.slice(0, 200)}`);
    }
  });
});

test("alur lengkap: login -> dashboard -> produk -> kasir -> transaksi", async ({ page }) => {
  test.setTimeout(120000);
  await login(page);

  // 1) Dashboard tampil
  await gotoDash(page, "/dashboard");
  console.log("[1] dashboard url:", page.url());
  expect(page.url()).toContain("/dashboard");
  const dashText = await page.locator("body").innerText();
  console.log("[1] dashboard punya 'Omzet':", dashText.includes("Omzet"));

  // 2) Produk: tambah 1 produk unik
  await gotoDash(page, "/dashboard/produk");
  const pname = "QA Produk " + Date.now();
  await page.getByPlaceholder("Kopi Susu").fill(pname);
  await page.getByPlaceholder("18000").fill("15000");
  await page.getByPlaceholder("12000").fill("9000");
  await page.getByRole("button", { name: "Tambah produk" }).click();
  await page.waitForTimeout(2500);
  const prodText = await page.locator("body").innerText();
  console.log("[2] produk tersimpan:", prodText.includes(pname));

  // 3) Kasir: tambah produk ke cart, bayar tunai
  await gotoDash(page, "/dashboard/kasir");
  await page.waitForTimeout(1500);
  const card = page.locator("button", { hasText: pname }).first();
  const found = await card.count();
  console.log("[3] produk muncul di kasir:", found > 0);
  if (found > 0) {
    await card.click();
    await page.waitForTimeout(500);
    // isi bayar tunai
    await page.getByPlaceholder("Nominal bayar").fill("20000");
    await page.getByRole("button", { name: "Bayar & simpan" }).click();
    await page.waitForTimeout(3000);
    const kasirText = await page.locator("body").innerText();
    console.log("[3] hasil checkout:", kasirText.includes("tersimpan") ? "TERSIMPAN" : kasirText.slice(0, 150).replace(/\n/g, " | "));
  }

  // 4) Transaksi: cek transaksi muncul
  await gotoDash(page, "/dashboard/transaksi");
  await page.waitForTimeout(1500);
  const txText = await page.locator("body").innerText();
  console.log("[4] ada baris transaksi 'Selesai':", txText.includes("Selesai"));

  console.log("=== CONSOLE ERRORS ===", JSON.stringify(errors.slice(0, 10)));
});
