import type { MetadataRoute } from "next";

const BASE = "https://posku-online.web.id";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Area privat tak perlu diindeks
      disallow: ["/dashboard", "/admin", "/login", "/suspended"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
