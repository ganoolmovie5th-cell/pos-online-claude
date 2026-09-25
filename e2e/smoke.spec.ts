import { test, expect } from "@playwright/test";

import { BASE } from "./config";
const stamp = Date.now();
const email = `qa${stamp}@gmail.com`;
const password = "test123456";
const bizName = `QA Bisnis ${stamp}`;

test("signup lalu masuk dashboard", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("response", async (r) => {
    if (r.status() >= 400 && r.url().includes("supabase")) {
      let bodyTxt = "";
      try { bodyTxt = await r.text(); } catch {}
      console.log("SUPABASE " + r.status() + " " + r.url() + " -> " + bodyTxt.slice(0, 300));
    }
  });

  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });

  // Isi form signup. Field: nama bisnis, nama, email, password (invite kosong).
  await page.getByPlaceholder("Kopi Senja").fill(bizName);
  await page.getByPlaceholder("Nama pemilik").fill("QA Tester");
  await page.getByPlaceholder("kamu@bisnis.com").fill(email);
  await page.getByPlaceholder("Minimal 6 karakter").fill(password);

  await page.getByRole("button", { name: "Daftar" }).click();

  // Tunggu salah satu: redirect ke dashboard ATAU pesan verifikasi email
  await page.waitForTimeout(4000);
  const url = page.url();
  const body = await page.locator("body").innerText();

  console.log("URL setelah signup:", url);
  console.log("CONSOLE ERRORS:", JSON.stringify(errors));
  if (body.includes("verifikasi")) console.log("HASIL: email confirmation AKTIF - signup tak langsung login");
  if (url.includes("/dashboard")) console.log("HASIL: langsung masuk dashboard - auth OK");
  console.log("CRED:", email, password);
});
