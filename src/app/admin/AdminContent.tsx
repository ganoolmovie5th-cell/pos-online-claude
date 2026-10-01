"use client";

import Link from "next/link";
import { rupiah, tanggal } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import AdminActions from "./AdminActions";

type Row = {
  id: string;
  name: string;
  created_at: string;
  is_suspended: boolean;
  count: number;
  omzet: number;
};

export default function AdminContent({
  rows,
  totalCount,
  activeCount,
  totalOmzet,
}: {
  rows: Row[];
  totalCount: number;
  activeCount: number;
  totalOmzet: number;
}) {
  const { t } = useApp();

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("admin.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.subtitle")}</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("admin.toDashboard")}
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label={t("admin.stat.total")} value={String(totalCount)} />
          <Stat label={t("admin.stat.active")} value={String(activeCount)} />
          <Stat label={t("admin.stat.revenue")} value={rupiah(totalOmzet)} />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("admin.col.business")}</th>
                <th className="px-4 py-3">{t("admin.col.created")}</th>
                <th className="px-4 py-3 text-right">{t("admin.col.transactions")}</th>
                <th className="px-4 py-3 text-right">{t("admin.col.revenue")}</th>
                <th className="px-4 py-3">{t("admin.col.status")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {t("admin.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{b.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{tanggal(b.created_at)}</td>
                    <td className="px-4 py-3 text-right dark:text-slate-100">{b.count}</td>
                    <td className="px-4 py-3 text-right dark:text-slate-100">{rupiah(b.omzet)}</td>
                    <td className="px-4 py-3">
                      {b.is_suspended ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          {t("admin.status.suspended")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          {t("admin.status.active")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AdminActions
                        businessId={b.id}
                        name={b.name}
                        suspended={b.is_suspended}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
