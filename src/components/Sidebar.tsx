"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/kasir", label: "Kasir" },
  { href: "/dashboard/produk", label: "Produk" },
  { href: "/dashboard/transaksi", label: "Transaksi" },
];

export default function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <>
      {/* Topbar mobile */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-bold text-brand-700">POS Online</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          Menu
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } border-b border-slate-200 bg-white md:block md:w-60 md:shrink-0 md:border-b-0 md:border-r`}
      >
        <div className="hidden px-6 py-6 md:block">
          <span className="text-lg font-bold text-brand-700">POS Online</span>
          <p className="mt-1 truncate text-sm text-slate-500">{businessName}</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {links.map((l) => {
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
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Keluar
          </button>
        </nav>
      </aside>
    </>
  );
}
