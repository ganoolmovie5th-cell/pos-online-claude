import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleTagManager } from "@next/third-parties/google";
import RegisterSW from "@/components/RegisterSW";
import { AppProvider } from "@/lib/i18n/provider";
import "./globals.css";

// Set theme + locale before first paint to avoid a flash of the wrong
// theme/language. Reads localStorage first, then the cookie, then defaults.
const initScript = `(function(){try{
var ls=localStorage;
var theme=ls.getItem('theme');
if(!theme){theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
if(theme==='dark'){document.documentElement.classList.add('dark');}
var loc=ls.getItem('locale');
if(!loc){var m=document.cookie.match(/(?:^|; )locale=(id|en)/);loc=m?m[1]:'id';}
document.documentElement.lang=loc;
}catch(e){}})();`;

export const metadata: Metadata = {
  title: "POS Online — Kasir untuk semua jenis usaha",
  description:
    "Aplikasi kasir online multi-industri: kelola produk, catat penjualan, dan pantau omzet dari mana saja.",
  verification: {
    google: "hdL2f8z85ebnV1bwE8mCn8Oqn_02D9t-y0MsTzS_014",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <GoogleTagManager gtmId="GTM-NK4MLR6T" />
      <body>
        <AppProvider>
          {children}
          <RegisterSW />
          <Analytics />
        </AppProvider>
      </body>
    </html>
  );
}
