"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, tanggal } from "@/lib/format";
import { receiptText } from "@/lib/receipt";
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

  // filter
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: user }] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(300),
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

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (method && s.payment_method !== method) return false;
      if (status && s.status !== status) return false;
      const d = new Date(s.created_at);
      if (from && d < new Date(from + "T00:00:00")) return false;
      if (to && d > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [sales, method, status, from, to]);

  async function openReceipt(sale: Sale) {
    setActive(sale);
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
    setItems((data as SaleItem[]) ?? []);
  }

  async function voidSale(sale: Sale) {
    if (!confirm("Batalkan (void) transaksi ini? Stok akan dikembalikan.")) return;
    const { error } = await supabase
      .from("sales")
      .update({ status: "voided", voided_at: new Date().toISOString() })
      .eq("id", sale.id);
    if (error) {
      alert("Gagal: " + error.message);
      return;
    }
    await supabase.rpc("restore_stock", { p_sale_id: sale.id });
    setActive(null);
    load();
  }

  function shareWa() {
    if (!active) return;
    const txt = receiptText(business, active, items);
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
  }

  async function copyReceipt() {
    if (!active) return;
    const txt = receiptText(business, active, items);
    try {
      await navigator.clipboard.writeText(txt);
      alert("Struk disalin.");
    } catch {
      alert("Gagal menyalin.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Transaksi</h1>
      <p className="mt-1 text-sm text-slate-500">Riwayat penjualan (maks. 300 terakhir).</p>

      {/* Filter */}
      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Dari</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Sampai</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Metode</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Semua</option>
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Transfer</option>
            <option value="ewallet">E-wallet</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Semua</option>
            <option value="completed">Selesai</option>
            <option value="voided">Dibatalkan</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Metode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada transaksi.</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className={s.status === "voided" ? "opacity-50" : ""}>
                  <td className="px-4 py-3 text-slate-700">{tanggal(s.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{methodLabel[s.payment_method] ?? s.payment_method}</td>
                  <td className="px-4 py-3">
                    {s.status === "voided" ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Dibatalkan</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Selesai</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{rupiah(s.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openReceipt(s)} className="text-brand-700 hover:underline">Struk</button>
                    {s.status !== "voided" && (
                      <button onClick={() => voidSale(s)} className="ml-3 text-red-600 hover:underline">Void</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal struk */}
      {active && (
        <div className="receipt-modal fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div id="receipt" className="text-sm">
              <div className="text-center">
                <p className="text-base font-bold text-slate-900">{business?.name ?? "Struk"}</p>
                {business?.address && <p className="text-xs text-slate-500">{business.address}</p>}
                {business?.phone && <p className="text-xs text-slate-500">{business.phone}</p>}
                <p className="mt-0.5 text-xs text-slate-500">{tanggal(active.created_at)}</p>
                {active.status === "voided" && (
                  <p className="mt-1 text-xs font-bold text-red-600">— DIBATALKAN —</p>
                )}
              </div>
              <div className="my-3 border-t border-dashed border-slate-300" />
              <ul className="space-y-1">
                {items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">{it.qty}× {it.name}</span>
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
                  <span>Total</span><span>{rupiah(active.total)}</span>
                </div>
                {active.payment_method === "cash" && (
                  <>
                    <Row label="Bayar" val={rupiah(active.paid)} />
                    <Row label="Kembali" val={rupiah(active.change)} />
                  </>
                )}
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">
                {business?.receipt_footer || "Terima kasih 🙏"}
              </p>
            </div>

            <div className="no-print mt-6 grid grid-cols-2 gap-2">
              <button onClick={() => window.print()} className="rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700">Cetak</button>
              <button onClick={shareWa} className="rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">WhatsApp</button>
              <button onClick={copyReceipt} className="rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Salin</button>
              <button onClick={() => setActive(null)} className="rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Tutup</button>
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
