"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, tanggal } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Shift } from "@/lib/types";

export default function ShiftPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [active, setActive] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [expected, setExpected] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: shifts } = await supabase
      .from("shifts")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(50);
    const rows = (shifts as Shift[]) ?? [];
    const open = rows.find((s) => s.closed_at == null) ?? null;
    setActive(open);
    setHistory(rows);

    // Hitung expected cash = kas awal + total penjualan tunai selama shift
    if (open) {
      const { data: sales } = await supabase
        .from("sales")
        .select("total, payment_method, payments, status")
        .eq("shift_id", open.id)
        .eq("status", "completed");
      type SaleRow = { total: number; payment_method: string; payments: { method: string; amount: number }[] | null };
      const cashSales = ((sales as SaleRow[]) ?? []).reduce((sum, r) => {
        if (r.payment_method === "cash") return sum + Number(r.total);
        // split: ambil komponen tunai saja
        if (r.payment_method === "split" && Array.isArray(r.payments)) {
          const cash = r.payments.filter((p) => p.method === "cash").reduce((a, p) => a + Number(p.amount), 0);
          return sum + cash;
        }
        return sum;
      }, 0);
      setExpected(Number(open.opening_cash) + cashSales);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function openShift() {
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("shifts").insert({
      cashier_id: user.user?.id ?? null,
      opening_cash: parseFloat(opening) || 0,
    });
    if (error) {
      alert(t("shift.failed") + error.message);
      return;
    }
    setOpening("");
    load();
  }

  async function closeShift() {
    if (!active) return;
    const closeCash = parseFloat(closing) || 0;
    const { error } = await supabase
      .from("shifts")
      .update({
        closing_cash: closeCash,
        expected_cash: expected,
        closed_at: new Date().toISOString(),
      })
      .eq("id", active.id);
    if (error) {
      alert(t("shift.failed") + error.message);
      return;
    }
    setClosing("");
    load();
  }

  if (loading) return <p className="text-center text-slate-400">{t("shift.loading")}</p>;

  const selisih = (parseFloat(closing) || 0) - expected;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("shift.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("shift.subtitle")}</p>

      {active ? (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-6 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-100">{t("shift.running")}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("shift.openedAt").replace("{n}", tanggal(active.opened_at))}</p>
          <div className="mt-4 space-y-1 text-sm">
            <Row label={t("shift.openingCash")} val={rupiah(active.opening_cash)} />
            <Row label={t("shift.cashSales")} val={rupiah(expected - Number(active.opening_cash))} />
            <Row label={t("shift.expectedCash")} val={rupiah(expected)} strong />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("shift.closingCashLabel")}</label>
            <input type="number" min="0" value={closing} onChange={(e) => setClosing(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="0" />
            {closing !== "" && (
              <p className={`mt-2 text-sm ${selisih === 0 ? "text-green-600" : "text-amber-600"}`}>
                {t("shift.diff").replace("{n}", rupiah(selisih))}
                {selisih === 0 ? t("shift.diff.even") : selisih > 0 ? t("shift.diff.over") : t("shift.diff.under")}
              </p>
            )}
          </div>
          <button onClick={closeShift}
            className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {t("shift.close")}
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("shift.noRunning")}</p>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("shift.openingCash")}</label>
            <input type="number" min="0" value={opening} onChange={(e) => setOpening(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="0" />
          </div>
          <button onClick={openShift}
            className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {t("shift.open")}
          </button>
        </div>
      )}

      {/* Riwayat */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("shift.col.opened")}</th>
              <th className="px-4 py-3">{t("shift.col.closed")}</th>
              <th className="px-4 py-3 text-right">{t("shift.col.openingCash")}</th>
              <th className="px-4 py-3 text-right">{t("shift.col.closingCash")}</th>
              <th className="px-4 py-3 text-right">{t("shift.col.diff")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.filter((s) => s.closed_at).length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("shift.noHistory")}</td></tr>
            ) : (
              history.filter((s) => s.closed_at).map((s) => {
                const sel = (Number(s.closing_cash) || 0) - (Number(s.expected_cash) || 0);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tanggal(s.opened_at)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.closed_at ? tanggal(s.closed_at) : "-"}</td>
                    <td className="px-4 py-3 text-right dark:text-slate-100">{rupiah(s.opening_cash)}</td>
                    <td className="px-4 py-3 text-right dark:text-slate-100">{rupiah(s.closing_cash ?? 0)}</td>
                    <td className={`px-4 py-3 text-right ${sel === 0 ? "text-slate-500 dark:text-slate-400" : "text-amber-600"}`}>
                      {rupiah(sel)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, val, strong }: { label: string; val: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-bold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );
}
