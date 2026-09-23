"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import type { Sale, SaleItem } from "@/lib/types";

type ItemJoin = SaleItem & {
  products?: {
    cost_price: number;
    category_id: string | null;
    categories?: { name: string } | null;
  } | null;
};

function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function LaporanPage() {
  const supabase = createClient();
  const [from, setFrom] = useState(todayStr(-6));
  const [to, setTo] = useState(todayStr(0));
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<ItemJoin[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const fromISO = new Date(from + "T00:00:00").toISOString();
    const toISO = new Date(to + "T23:59:59").toISOString();
    const { data: s } = await supabase
      .from("sales")
      .select("*")
      .eq("status", "completed")
      .gte("created_at", fromISO)
      .lte("created_at", toISO)
      .order("created_at", { ascending: false });
    const rows = (s as Sale[]) ?? [];
    setSales(rows);

    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: it } = await supabase
        .from("sale_items")
        .select("*, products(cost_price, category_id, categories(name))")
        .in("sale_id", ids);
      setItems((it as ItemJoin[]) ?? []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [supabase, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const omzet = sales.reduce((s, r) => s + Number(r.total), 0);
  const jumlah = sales.length;
  const rata = jumlah ? omzet / jumlah : 0;

  const perHari = useMemo(() => {
    const m = new Map<string, { omzet: number; count: number }>();
    sales.forEach((r) => {
      const day = r.created_at.slice(0, 10);
      const cur = m.get(day) ?? { omzet: 0, count: 0 };
      cur.omzet += Number(r.total);
      cur.count += 1;
      m.set(day, cur);
    });
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [sales]);

  const terlaris = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => m.set(it.name, (m.get(it.name) ?? 0) + Number(it.qty)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [items]);

  // Laba kotor = penjualan item - (modal x qty)
  const modal = items.reduce(
    (s, it) => s + Number(it.products?.cost_price ?? 0) * Number(it.qty),
    0
  );
  const penjualanItem = items.reduce((s, it) => s + Number(it.line_total), 0);
  const laba = penjualanItem - modal;

  const perKategori = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => {
      const cat = it.products?.categories?.name ?? "Tanpa kategori";
      m.set(cat, (m.get(cat) ?? 0) + Number(it.line_total));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  function exportCsv() {
    const header = ["Tanggal", "Metode", "Subtotal", "Diskon", "Pajak", "Total"];
    const rows = sales.map((r) => [
      r.created_at,
      r.payment_method,
      r.subtotal,
      r.discount,
      r.tax,
      r.total,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
      <p className="mt-1 text-sm text-slate-500">Rekap penjualan (transaksi selesai saja).</p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Dari</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Sampai</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <button onClick={exportCsv} disabled={!sales.length}
          className="ml-auto rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          Export CSV
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total omzet" value={rupiah(omzet)} />
        <Stat label="Jumlah transaksi" value={String(jumlah)} />
        <Stat label="Rata-rata / transaksi" value={rupiah(rata)} />
        <Stat label="Modal (HPP)" value={rupiah(modal)} />
        <Stat label="Laba kotor" value={rupiah(laba)} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Omzet per kategori</h2>
        {perKategori.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Tidak ada data.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {perKategori.map(([cat, val]) => (
              <li key={cat} className="flex items-center justify-between">
                <span className="text-slate-600">{cat}</span>
                <span className="font-medium text-slate-900">{rupiah(val)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Omzet per hari</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Memuat...</p>
          ) : perHari.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Tidak ada data.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {perHari.map(([day, v]) => (
                <li key={day} className="flex items-center justify-between">
                  <span className="text-slate-600">{day}</span>
                  <span className="font-medium text-slate-900">
                    {rupiah(v.omzet)} <span className="text-xs text-slate-400">({v.count}x)</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Produk terlaris</h2>
          {terlaris.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Tidak ada data.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {terlaris.map(([name, qty], i) => (
                <li key={name} className="flex items-center justify-between">
                  <span className="text-slate-600">
                    <span className="mr-2 text-slate-400">{i + 1}.</span>
                    {name}
                  </span>
                  <span className="font-medium text-slate-900">{qty} terjual</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
