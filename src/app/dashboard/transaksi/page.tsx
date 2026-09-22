"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, tanggal } from "@/lib/format";
import type { Business, Sale, SaleItem } from "@/lib/types";

const methodLabel: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  ewallet: "E-wallet",
};

export default function TransaksiPage() {
  const supabase = createClient();
  const [sales, setSales] = useState<Sale[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: user }] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.auth.getUser(),
    ]);
    setSales((s as Sale[]) ?? []);
    if (user.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("businesses(*)")
        .eq("id", user.user.id)
        .single();
      setBusiness((profile?.businesses as unknown as Business) ?? null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function openReceipt(sale: Sale) {
    setActive(sale);
    const { data } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale.id);
    setItems((data as SaleItem[]) ?? []);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Transaksi</h1>
      <p className="mt-1 text-sm text-slate-500">Riwayat penjualan terbaru (maks. 100).</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Metode</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Memuat...
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Belum ada transaksi.
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-slate-700">{tanggal(s.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {methodLabel[s.payment_method] ?? s.payment_method}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{rupiah(s.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openReceipt(s)}
                      className="text-brand-700 hover:underline"
                    >
                      Struk
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal struk */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div id="receipt" className="text-sm">
              <div className="text-center">
                <p className="text-base font-bold text-slate-900">
                  {business?.name ?? "Struk"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{tanggal(active.created_at)}</p>
              </div>
              <div className="my-3 border-t border-dashed border-slate-300" />
              <ul className="space-y-1">
                {items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {it.qty}× {it.name}
                    </span>
                    <span>{rupiah(it.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="my-3 border-t border-dashed border-slate-300" />
              <div className="space-y-1">
                <Row label="Subtotal" val={rupiah(active.subtotal)} />
                {active.discount > 0 && <Row label="Diskon" val={"-" + rupiah(active.discount)} />}
                {active.tax > 0 && <Row label="Pajak" val={rupiah(active.tax)} />}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{rupiah(active.total)}</span>
                </div>
                {active.payment_method === "cash" && (
                  <>
                    <Row label="Bayar" val={rupiah(active.paid)} />
                    <Row label="Kembali" val={rupiah(active.change)} />
                  </>
                )}
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">Terima kasih 🙏</p>
            </div>

            <div className="no-print mt-6 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Cetak
              </button>
              <button
                onClick={() => setActive(null)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );
}
