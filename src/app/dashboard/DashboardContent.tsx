"use client";

import Link from "next/link";
import { rupiah } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";

type LowStock = { id: string; name: string; stock: number };
type Top = [string, number];

export default function DashboardContent({
  businessName,
  isAdmin,
  omzet,
  jumlah,
  lowStock,
  top,
}: {
  businessName: string;
  isAdmin: boolean;
  omzet: number;
  jumlah: number;
  lowStock: LowStock[];
  top: Top[];
}) {
  const { t } = useApp();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("dash.greeting").replace("{name}", businessName)}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("dash.subtitle")}</p>
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t("dash.adminPanel")}
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("dash.omzetToday")}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{rupiah(omzet)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("dash.txToday")}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{jumlah}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
          <h2 className="font-semibold text-amber-800 dark:text-amber-300">
            {t("dash.lowStockTitle").replace("{count}", String(lowStock.length))}
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            {lowStock.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">{p.name}</span>
                <span className={`font-medium ${p.stock <= 0 ? "text-red-600" : "text-amber-700 dark:text-amber-400"}`}>
                  {p.stock <= 0 ? t("dash.outOfStock") : t("dash.remaining").replace("{n}", String(p.stock))}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/restock" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            {t("dash.addStock")}
          </Link>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("dash.topProducts")}</h2>
        {top.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            {t("dash.noSales")}{" "}
            <Link href="/dashboard/kasir" className="text-brand-700 hover:underline">
              {t("dash.openKasir")}
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {top.map(([name, qty], i) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  <span className="mr-2 text-slate-400">{i + 1}.</span>
                  {name}
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {t("dash.sold").replace("{n}", String(qty))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/kasir"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t("dash.startTx")}
        </Link>
        <Link
          href="/dashboard/produk"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t("dash.manageProducts")}
        </Link>
      </div>
    </div>
  );
}
