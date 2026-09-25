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
      rest.push(`${r.status()} ${r.url().split("/rest/v1/")[1]?.split("?")[0]} -> ${b.slice(0, 120)}`);
    }
  });
});

test("undang staf: buat kode undangan", async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await go(page, "/dashboard/anggota");
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  console.log("[anggota] halaman tampil (ada 'Anggota'):", body.includes("Anggota"));
  // buat kode undangan
  const btn = page.getByRole("button", { name: "Buat kode" });
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(2500);
    const after = await page.locator("body").innerText();
    // kode 6 char uppercase muncul
    const hasCode = /[A-Z0-9]{6}/.test(after);
    console.log("[anggota] kode undangan dibuat:", hasCode);
  } else {
    console.log("[anggota] tombol Buat kode tak ada");
  }
  console.log("=== REST ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});

test("panel admin: tampil daftar bisnis", async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await go(page, "/admin");
  await page.waitForTimeout(2000);
  const url = page.url();
  const body = await page.locator("body").innerText();
  console.log("[admin] url:", url);
  console.log("[admin] halaman admin tampil (ada 'Admin Platform'):", body.includes("Admin Platform"));
  console.log("[admin] ada statistik 'Total bisnis':", body.includes("Total bisnis"));
  // jumlah baris bisnis
  const rows = await page.locator("table tbody tr").count();
  console.log("[admin] jumlah baris bisnis:", rows);
  console.log("=== REST ===", rest.length ? JSON.stringify(rest) : "TIDAK ADA");
});
