"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, tanggal } from "@/lib/format";
import type { Shift } from "@/lib/types";

export default function ShiftPage() {
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
      alert("Gagal: " + error.message);
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
      alert("Gagal: " + error.message);
      return;
    }
    setClosing("");
    load();
  }

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;

  const selisih = (parseFloat(closing) || 0) - expected;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Shift kasir</h1>
      <p className="mt-1 text-sm text-slate-500">Buka dan tutup kas untuk mencatat uang laci.</p>

      {active ? (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-6">
          <p className="text-sm font-medium text-brand-700">Shift sedang berjalan</p>
          <p className="mt-1 text-xs text-slate-500">Dibuka {tanggal(active.opened_at)}</p>
          <div className="mt-4 space-y-1 text-sm">
            <Row label="Kas awal" val={rupiah(active.opening_cash)} />
            <Row label="Penjualan tunai" val={rupiah(expected - Number(active.opening_cash))} />
            <Row label="Kas seharusnya" val={rupiah(expected)} strong />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Kas akhir (hitung fisik)</label>
            <input type="number" min="0" value={closing} onChange={(e) => setClosing(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0" />
            {closing !== "" && (
              <p className={`mt-2 text-sm ${selisih === 0 ? "text-green-600" : "text-amber-600"}`}>
                Selisih: {rupiah(selisih)} {selisih === 0 ? "(pas)" : selisih > 0 ? "(lebih)" : "(kurang)"}
              </p>
            )}
          </div>
          <button onClick={closeShift}
            className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Tutup shift
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Belum ada shift berjalan.</p>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Kas awal</label>
            <input type="number" min="0" value={opening} onChange={(e) => setOpening(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0" />
          </div>
          <button onClick={openShift}
            className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Buka shift
          </button>
        </div>
      )}

      {/* Riwayat */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Dibuka</th>
              <th className="px-4 py-3">Ditutup</th>
              <th className="px-4 py-3 text-right">Kas awal</th>
              <th className="px-4 py-3 text-right">Kas akhir</th>
              <th className="px-4 py-3 text-right">Selisih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.filter((s) => s.closed_at).length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada riwayat shift.</td></tr>
            ) : (
              history.filter((s) => s.closed_at).map((s) => {
                const sel = (Number(s.closing_cash) || 0) - (Number(s.expected_cash) || 0);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-slate-600">{tanggal(s.opened_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{s.closed_at ? tanggal(s.closed_at) : "-"}</td>
                    <td className="px-4 py-3 text-right">{rupiah(s.opening_cash)}</td>
                    <td className="px-4 py-3 text-right">{rupiah(s.closing_cash ?? 0)}</td>
                    <td className={`px-4 py-3 text-right ${sel === 0 ? "text-slate-500" : "text-amber-600"}`}>
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
    <div className={`flex justify-between ${strong ? "font-bold text-slate-900" : "text-slate-600"}`}>
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );
}
