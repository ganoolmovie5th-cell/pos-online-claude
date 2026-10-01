"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Expense, Outlet, Sale, SaleItem } from "@/lib/types";

type ItemJoin = SaleItem & {
  products?: {
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
  const { t } = useApp();
  const supabase = createClient();
  const [from, setFrom] = useState(todayStr(-6));
  const [to, setTo] = useState(todayStr(0));
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<ItemJoin[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const fromISO = new Date(from + "T00:00:00").toISOString();
    const toISO = new Date(to + "T23:59:59").toISOString();
    let q = supabase
      .from("sales")
      .select("*")
      .eq("status", "completed")
      .gte("created_at", fromISO)
      .lte("created_at", toISO)
      .order("created_at", { ascending: false });
    if (outletId) q = q.eq("outlet_id", outletId);
    const { data: s } = await q;
    const rows = (s as Sale[]) ?? [];
    setSales(rows);

    const { data: o } = await supabase.from("outlets").select("*").order("name");
    setOutlets((o as Outlet[]) ?? []);

    const { data: exp } = await supabase
      .from("expenses")
      .select("*")
      .gte("spent_at", from)
      .lte("spent_at", to);
    setExpenses((exp as Expense[]) ?? []);

    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: it } = await supabase
        .from("sale_items")
        .select("*, products(category_id, categories(name))")
        .in("sale_id", ids);
      setItems((it as ItemJoin[]) ?? []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [supabase, from, to, outletId]);

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
    (s, it) => s + Number(it.cost_price ?? 0) * Number(it.qty),
    0
  );
  const penjualanItem = items.reduce((s, it) => s + Number(it.line_total), 0);
  const laba = penjualanItem - modal;
  const totalBiaya = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const labaBersih = laba - totalBiaya;

  const perKategori = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => {
      const cat = it.products?.categories?.name ?? t("laporan.noCategory");
      m.set(cat, (m.get(cat) ?? 0) + Number(it.line_total));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, t]);

  function exportCsv() {
    const header = [
      t("laporan.csv.date"),
      t("laporan.csv.method"),
      t("laporan.csv.subtotal"),
      t("laporan.csv.discount"),
      t("laporan.csv.tax"),
      t("laporan.csv.total"),
    ];
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
    <div id="print-area" className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("laporan.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("laporan.subtitle")}</p>
        </div>
        <p className="hidden text-right text-xs text-slate-500 dark:text-slate-400 print:block">
          {t("laporan.period").replace("{from}", from).replace("{to}", to)}
        </p>
      </div>

      <div className="no-print mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("laporan.from")}</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("laporan.to")}</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        {outlets.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("laporan.outlet")}</label>
            <select value={outletId} onChange={(e) => setOutletId(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="">{t("laporan.allOutlets")}</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={() => window.print()} disabled={!sales.length}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            {t("laporan.print")}
          </button>
          <button onClick={exportCsv} disabled={!sales.length}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {t("laporan.exportCsv")}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label={t("laporan.stat.omzet")} value={rupiah(omzet)} />
        <Stat label={t("laporan.stat.count")} value={String(jumlah)} />
        <Stat label={t("laporan.stat.avg")} value={rupiah(rata)} />
      </div>

      {/* Grafik omzet per hari (SVG murni) */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("laporan.chart.title")}</h2>
        <BarChart data={[...perHari].reverse()} noData={t("laporan.noData")} />
      </div>

      {/* Laba-rugi */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("laporan.pl.title")}</h2>
        <div className="mt-4 space-y-2 text-sm">
          <LR label={t("laporan.pl.sales")} val={rupiah(penjualanItem)} />
          <LR label={t("laporan.pl.cogs")} val={"- " + rupiah(modal)} />
          <div className="flex justify-between border-t border-slate-100 pt-2 font-medium dark:border-slate-800">
            <span className="text-slate-700 dark:text-slate-300">{t("laporan.pl.grossProfit")}</span>
            <span className="dark:text-slate-100">{rupiah(laba)}</span>
          </div>
          <LR label={t("laporan.pl.opex")} val={"- " + rupiah(totalBiaya)} />
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-700">
            <span className="dark:text-white">{t("laporan.pl.netProfit")}</span>
            <span className={labaBersih < 0 ? "text-red-600" : "text-green-600"}>{rupiah(labaBersih)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("laporan.byCategory.title")}</h2>
        {perKategori.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{t("laporan.noData")}</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {perKategori.map(([cat, val]) => (
              <li key={cat} className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                <span className="font-medium text-slate-900 dark:text-white">{rupiah(val)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("laporan.perDay.title")}</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">{t("laporan.loading")}</p>
          ) : perHari.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">{t("laporan.noData")}</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {perHari.map(([day, v]) => (
                <li key={day} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{day}</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {rupiah(v.omzet)} <span className="text-xs text-slate-400">{t("laporan.count").replace("{n}", String(v.count))}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("laporan.topProducts.title")}</h2>
          {terlaris.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">{t("laporan.noData")}</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {terlaris.map(([name, qty], i) => (
                <li key={name} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    <span className="mr-2 text-slate-400">{i + 1}.</span>
                    {name}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">{t("laporan.sold").replace("{n}", String(qty))}</span>
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function LR({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );
}

// Bar chart SVG murni, tanpa library.
function BarChart({ data, noData }: { data: [string, { omzet: number; count: number }][]; noData: string }) {
  if (data.length === 0) return <p className="mt-4 text-sm text-slate-400">{noData}</p>;
  const max = Math.max(...data.map((d) => d[1].omzet), 1);
  const barW = 100 / data.length;
  return (
    <svg viewBox="0 0 100 40" className="mt-4 h-40 w-full" preserveAspectRatio="none">
      {data.map(([day, v], i) => {
        const h = (v.omzet / max) * 36;
        return (
          <g key={day}>
            <rect
              x={i * barW + barW * 0.15}
              y={38 - h}
              width={barW * 0.7}
              height={Math.max(h, 0.5)}
              className="fill-brand-500"
              rx="0.5"
            >
              <title>{`${day}: ${v.omzet.toLocaleString("id-ID")}`}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}
