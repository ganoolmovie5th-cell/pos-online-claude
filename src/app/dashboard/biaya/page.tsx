"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Expense } from "@/lib/types";

const KATEGORI = ["Sewa", "Listrik & Air", "Gaji", "Bahan Baku", "Transport", "Pemasaran", "Lainnya"];

const KATEGORI_KEY: Record<string, string> = {
  "Sewa": "biaya.cat.sewa",
  "Listrik & Air": "biaya.cat.listrikAir",
  "Gaji": "biaya.cat.gaji",
  "Bahan Baku": "biaya.cat.bahanBaku",
  "Transport": "biaya.cat.transport",
  "Pemasaran": "biaya.cat.pemasaran",
  "Lainnya": "biaya.cat.lainnya",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BiayaPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(KATEGORI[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [spentAt, setSpentAt] = useState(todayStr());

  const catLabel = (c: string) => (KATEGORI_KEY[c] ? t(KATEGORI_KEY[c]) : c);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("spent_at", { ascending: false })
      .limit(100);
    setExpenses((data as Expense[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return alert(t("biaya.fillAmount"));
    const { error } = await supabase.from("expenses").insert({
      category,
      amount: amt,
      note: note.trim() || null,
      spent_at: spentAt,
    });
    if (error) return alert(t("biaya.failed") + error.message);
    setAmount("");
    setNote("");
    load();
  }

  async function remove(id: string) {
    if (!confirm(t("biaya.confirmDelete"))) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("biaya.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("biaya.subtitle")}</p>

      <form onSubmit={add} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("biaya.category")}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            {KATEGORI.map((k) => <option key={k} value={k}>{catLabel(k)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("biaya.amount")}</label>
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="0" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("biaya.date")}</label>
          <input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("biaya.note")}</label>
          <input value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("biaya.note.placeholder")} />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {t("biaya.add")}
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("biaya.totalLabel")}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{rupiah(total)}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("biaya.date")}</th>
              <th className="px-4 py-3">{t("biaya.category")}</th>
              <th className="px-4 py-3">{t("biaya.note")}</th>
              <th className="px-4 py-3 text-right">{t("biaya.amountShort")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("biaya.loading")}</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("biaya.empty")}</td></tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.spent_at}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{catLabel(e.category)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{e.note ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium dark:text-slate-100">{rupiah(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(e.id)} className="text-red-600 hover:underline">{t("biaya.delete")}</button>
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
