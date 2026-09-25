import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleTagManager } from "@next/third-parties/google";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Online — Kasir untuk semua jenis usaha",
  description:
    "Aplikasi kasir online multi-industri: kelola produk, catat penjualan, dan pantau omzet dari mana saja.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <GoogleTagManager gtmId="GTM-NK4MLR6T" />
      <body>
        {children}
        <RegisterSW />
        <Analytics />
      </body>
    </html>
  );
}
