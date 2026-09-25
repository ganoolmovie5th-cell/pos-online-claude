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

test("#9 buat kode undangan lalu signup staf pakai kode", async ({ page, context }) => {
  test.setTimeout(120000);
  await login(page);

  // Buat kode undangan (peran kasir)
  await go(page, "/dashboard/anggota");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Buat kode" }).click();
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  const m = body.match(/\b[A-Z0-9]{6}\b/);
  const code = m ? m[0] : "";
  console.log("[9] kode undangan:", code || "TAK DITEMUKAN");

  // Logout: pakai context baru (clear session) via signup di tab bersih
  await context.clearCookies();

  // Signup staf pakai kode
  await go(page, "/signup");
  const stamp = Date.now();
  await page.getByPlaceholder("Kopi Senja").fill("").catch(() => {}); // biz name hidden saat kode diisi
  // isi kode undangan dulu (bikin nama bisnis tersembunyi)
  await page.getByPlaceholder("Kosongkan kalau bikin bisnis baru").fill(code);
  await page.waitForTimeout(500);
  await page.getByPlaceholder("Nama pemilik").fill("Staf QA");
  await page.getByPlaceholder("kamu@bisnis.com").fill(`staf${stamp}@gmail.com`);
  await page.getByPlaceholder("Minimal 6 karakter").fill("staf123456");

  let authStatus = 0;
  page.on("response", (r) => {
    if (r.url().includes("/auth/v1/signup")) authStatus = r.status();
  });
  await page.getByRole("button", { name: "Daftar" }).click();
  await page.waitForTimeout(4000);

  const after = await page.locator("body").innerText();
  console.log("[9] signup status:", authStatus);
  console.log("[9] pesan verifikasi email muncul:", after.includes("verifikasi"));
  console.log("[9] (kalau confirm-email off, harusnya masuk dashboard):", page.url().includes("/dashboard"));
  console.log("[9] CATATAN: join bisnis via kode terjadi di trigger handle_new_user saat email terverifikasi");
});
