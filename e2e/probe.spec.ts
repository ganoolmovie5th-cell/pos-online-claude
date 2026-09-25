import { test } from "@playwright/test";

const BASE = "https://pos-online-claude.vercel.app";

test("probe protected route tanpa login", async ({ page }) => {
  const resp = await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" }).catch((e) => {
    console.log("GOTO ERR:", e.message);
    return null;
  });
  console.log("status:", resp?.status(), "url:", page.url());
});

test("probe login page status", async ({ page }) => {
  const resp = await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  console.log("login status:", resp?.status());
});
