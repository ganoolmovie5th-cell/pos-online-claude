"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tanggal } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { AuditLog, Profile } from "@/lib/types";

export default function AuditPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const actionLabel: Record<string, string> = {
    void_sale: t("audit.action.void_sale"),
    refund: t("audit.action.refund"),
    delete_product: t("audit.action.delete_product"),
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, { data: profiles }] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setLogs((rows as AuditLog[]) ?? []);
    const m: Record<string, string> = {};
    ((profiles as Pick<Profile, "id" | "full_name">[]) ?? []).forEach((p) => {
      m[p.id] = p.full_name ?? "—";
    });
    setNames(m);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("audit.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("audit.subtitle")}</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("audit.col.time")}</th>
              <th className="px-4 py-3">{t("audit.col.action")}</th>
              <th className="px-4 py-3">{t("audit.col.by")}</th>
              <th className="px-4 py-3">{t("audit.col.detail")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("audit.loading")}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("audit.empty")}</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tanggal(l.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{actionLabel[l.action] ?? l.action}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{l.actor_id ? names[l.actor_id] ?? "—" : "—"}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {l.detail ? (
                      <span className="text-xs">{JSON.stringify(l.detail)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
