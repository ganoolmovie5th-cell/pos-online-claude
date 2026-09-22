import { requireBusiness } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import type { Sale, SaleItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const { supabase, business } = await requireBusiness();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: todaySales } = await supabase
    .from("sales")
    .select("total")
    .gte("created_at", startOfDay.toISOString());

  const sales = (todaySales as Pick<Sale, "total">[]) ?? [];
  const omzet = sales.reduce((s, r) => s + Number(r.total), 0);
  const jumlah = sales.length;

  // Produk terlaris (30 hari terakhir, agregat di app — cukup untuk MVP)
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const { data: itemRows } = await supabase
    .from("sale_items")
    .select("name, qty, sales!inner(created_at)")
    .gte("sales.created_at", last30.toISOString());

  const tally = new Map<string, number>();
  ((itemRows as (Pick<SaleItem, "name" | "qty">[])) ?? []).forEach((r) => {
    tally.set(r.name, (tally.get(r.name) ?? 0) + Number(r.qty));
  });
  const top = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Halo, {business.name}</h1>
      <p className="mt-1 text-sm text-slate-500">Ringkasan bisnismu hari ini.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Omzet hari ini</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{rupiah(omzet)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Transaksi hari ini</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{jumlah}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Produk terlaris (30 hari)</h2>
        {top.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Belum ada penjualan.{" "}
            <Link href="/dashboard/kasir" className="text-brand-700 hover:underline">
              Buka kasir
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {top.map(([name, qty], i) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  <span className="mr-2 text-slate-400">{i + 1}.</span>
                  {name}
                </span>
                <span className="font-medium text-slate-900">{qty} terjual</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/kasir"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Mulai transaksi
        </Link>
        <Link
          href="/dashboard/produk"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Kelola produk
        </Link>
      </div>
    </div>
  );
}
