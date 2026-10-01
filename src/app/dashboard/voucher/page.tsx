"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Voucher } from "@/lib/types";

export default function VoucherPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"amount" | "percent">("amount");
  const [value, setValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("vouchers").select("*").order("created_at", { ascending: false });
    setVouchers((data as Voucher[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    const v = parseFloat(value) || 0;
    if (!c || v <= 0) return alert(t("voucher.fillCodeValue"));
    const { error } = await supabase.from("vouchers").insert({ code: c, kind, value: v });
    if (error) return alert(t("voucher.failed") + error.message);
    setCode("");
    setValue("");
    load();
  }

  async function toggle(v: Voucher) {
    await supabase.from("vouchers").update({ is_active: !v.is_active }).eq("code", v.code);
    load();
  }

  async function remove(codeToDel: string) {
    if (!confirm(t("voucher.confirmDelete"))) return;
    await supabase.from("vouchers").delete().eq("code", codeToDel);
    load();
  }

  if (loading) return <p className="text-center text-slate-400">{t("voucher.loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("voucher.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("voucher.subtitle")}</p>

      <form onSubmit={create} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("voucher.code")}</label>
          <input value={code} onChange={(e) => setCode(e.target.value)}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="HEMAT10" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("voucher.kind")}</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as "amount" | "percent")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="amount">{t("voucher.kind.amount")}</option>
            <option value="percent">{t("voucher.kind.percent")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("voucher.value")}</label>
          <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="0" />
        </div>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          {t("voucher.create")}
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("voucher.code")}</th>
              <th className="px-4 py-3">{t("voucher.col.discount")}</th>
              <th className="px-4 py-3">{t("voucher.col.status")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {vouchers.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("voucher.empty")}</td></tr>
            ) : (
              vouchers.map((v) => (
                <tr key={v.code}>
                  <td className="px-4 py-3 font-mono font-bold tracking-wide text-slate-900 dark:text-white">{v.code}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {v.kind === "percent" ? `${v.value}%` : rupiah(v.value)}
                  </td>
                  <td className="px-4 py-3">
                    {v.is_active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{t("voucher.active")}</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t("voucher.inactive")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggle(v)} className="text-brand-700 hover:underline">
                      {v.is_active ? t("voucher.deactivate") : t("voucher.activate")}
                    </button>
                    <button onClick={() => remove(v.code)} className="ml-3 text-red-600 hover:underline">{t("voucher.delete")}</button>
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
