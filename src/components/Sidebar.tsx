"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppControls from "@/components/AppControls";
import { useApp } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const links: { href: string; key: TranslationKey; ownerOnly: boolean }[] = [
  { href: "/dashboard", key: "menu.dashboard", ownerOnly: false },
  { href: "/dashboard/kasir", key: "menu.kasir", ownerOnly: false },
  { href: "/dashboard/meja", key: "menu.meja", ownerOnly: false },
  { href: "/dashboard/produk", key: "menu.produk", ownerOnly: false },
  { href: "/dashboard/kategori", key: "menu.kategori", ownerOnly: true },
  { href: "/dashboard/varian", key: "menu.varian", ownerOnly: true },
  { href: "/dashboard/bundle", key: "menu.bundle", ownerOnly: true },
  { href: "/dashboard/restock", key: "menu.restock", ownerOnly: true },
  { href: "/dashboard/opname", key: "menu.opname", ownerOnly: true },
  { href: "/dashboard/stok-outlet", key: "menu.stokOutlet", ownerOnly: true },
  { href: "/dashboard/label", key: "menu.label", ownerOnly: true },
  { href: "/dashboard/transaksi", key: "menu.transaksi", ownerOnly: false },
  { href: "/dashboard/pelanggan", key: "menu.pelanggan", ownerOnly: false },
  { href: "/dashboard/voucher", key: "menu.voucher", ownerOnly: true },
  { href: "/dashboard/biaya", key: "menu.biaya", ownerOnly: true },
  { href: "/dashboard/shift", key: "menu.shift", ownerOnly: false },
  { href: "/dashboard/laporan", key: "menu.laporan", ownerOnly: true },
  { href: "/dashboard/analitik", key: "menu.analitik", ownerOnly: true },
  { href: "/dashboard/anggota", key: "menu.anggota", ownerOnly: true },
  { href: "/dashboard/audit", key: "menu.audit", ownerOnly: true },
  { href: "/dashboard/pengaturan", key: "menu.pengaturan", ownerOnly: true },
];

export default function Sidebar({
  businessName,
  role,
}: {
  businessName: string;
  role: string;
}) {
  const isOwner = role === "owner";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useApp();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <>
      {/* Topbar mobile */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <span className="font-bold text-brand-700 dark:text-brand-100">{t("app.name")}</span>
        <div className="flex items-center gap-2">
          <AppControls />
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:text-slate-200"
          >
            {t("nav.menu")}
          </button>
        </div>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block md:w-60 md:shrink-0 md:border-b-0 md:border-r`}
      >
        <div className="hidden px-6 py-6 md:block">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold text-brand-700 dark:text-brand-100">{t("app.name")}</span>
            <AppControls />
          </div>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{businessName}</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {links.filter((l) => isOwner || !l.ownerOnly).map((l) => {
            const active =
              l.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-100"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {t(l.key)}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            {t("nav.logout")}
          </button>
        </nav>
      </aside>
    </>
  );
}
