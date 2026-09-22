import { requireAdmin } from "@/lib/auth";
import { rupiah, tanggal } from "@/lib/format";
import type { Business, Sale } from "@/lib/types";
import Link from "next/link";
import AdminActions from "./AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();

  const [{ data: bizRows }, { data: saleRows }] = await Promise.all([
    supabase.from("businesses").select("*").order("created_at", { ascending: false }),
    supabase.from("sales").select("business_id, total"),
  ]);

  const businesses = (bizRows as Business[]) ?? [];
  const sales = (saleRows as Pick<Sale, "business_id" | "total">[]) ?? [];

  // Agregat omzet + jumlah transaksi per bisnis
  const stats = new Map<string, { count: number; omzet: number }>();
  sales.forEach((s) => {
    const cur = stats.get(s.business_id) ?? { count: 0, omzet: 0 };
    cur.count += 1;
    cur.omzet += Number(s.total);
    stats.set(s.business_id, cur);
  });

  const totalOmzet = sales.reduce((s, r) => s + Number(r.total), 0);
  const aktif = businesses.filter((b) => !b.is_suspended).length;

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Platform</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola semua bisnis penyewa.</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Ke dashboard
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Total bisnis" value={String(businesses.length)} />
          <Stat label="Bisnis aktif" value={String(aktif)} />
          <Stat label="Total omzet (semua)" value={rupiah(totalOmzet)} />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Bisnis</th>
                <th className="px-4 py-3">Dibuat</th>
                <th className="px-4 py-3 text-right">Transaksi</th>
                <th className="px-4 py-3 text-right">Omzet</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada bisnis terdaftar.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => {
                  const st = stats.get(b.id) ?? { count: 0, omzet: 0 };
                  return (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{b.name}</td>
                      <td className="px-4 py-3 text-slate-500">{tanggal(b.created_at)}</td>
                      <td className="px-4 py-3 text-right">{st.count}</td>
                      <td className="px-4 py-3 text-right">{rupiah(st.omzet)}</td>
                      <td className="px-4 py-3">
                        {b.is_suspended ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            Ditangguhkan
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AdminActions
                          businessId={b.id}
                          name={b.name}
                          suspended={b.is_suspended}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
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
