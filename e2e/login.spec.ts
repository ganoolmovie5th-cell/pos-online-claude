import { test } from "@playwright/test";

import { BASE } from "./config";

test("login admin seed", async ({ page, context }) => {
  page.on("response", async (r) => {
    if (r.url().includes("/auth/v1/token") || (r.status() >= 400 && r.url().includes("supabase"))) {
      let b = ""; try { b = await r.text(); } catch {}
      console.log("AUTH " + r.status() + " " + r.url().split("supabase.co")[1] + " -> " + b.slice(0, 150));
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("kamu@bisnis.com").fill("admin@posonline.app");
  await page.getByPlaceholder("••••••••").fill("admin12345");
  await page.getByRole("button", { name: "Masuk" }).click();

  // Tunggu navigasi selesai (hard nav). Beri waktu cukup.
  await page.waitForTimeout(6000);

  const cookies = await context.cookies();
  const authCookie = cookies.find((c) => c.name.includes("auth-token") || c.name.includes("sb-"));
  console.log("URL:", page.url());
  console.log("AUTH COOKIE ADA:", !!authCookie, authCookie?.name ?? "");
  const err = await page.locator("p.text-red-600").count();
  if (err) console.log("LOGIN ERR:", await page.locator("p.text-red-600").first().innerText());
});
