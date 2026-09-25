import type { MetadataRoute } from "next";

const BASE = "https://posku-online.web.id";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Hanya halaman publik. Dashboard/admin privat -> tak masuk sitemap.
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
