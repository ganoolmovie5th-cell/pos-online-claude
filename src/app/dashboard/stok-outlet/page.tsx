"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Outlet, OutletStock, Product } from "@/lib/types";

export default function StokOutletPage() {
  const supabase = createClient();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<OutletStock[]>([]);
  const [outletId, setOutletId] = useState("");
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from("outlets").select("*").order("name"),
      supabase.from("products").select("*").not("stock", "is", null).order("name"),
    ]);
    setOutlets((o as Outlet[]) ?? []);
    setProducts((p as Product[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const loadStock = useCallback(async (oid: string) => {
    if (!oid) return;
    const { data } = await supabase.from("outlet_stock").select("*").eq("outlet_id", oid);
    setRows((data as OutletStock[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    if (outletId) loadStock(outletId);
  }, [outletId, loadStock]);

  const stockOf = (pid: string) => rows.find((r) => r.product_id === pid)?.stock ?? 0;

  async function save() {
    setMsg("");
    const updates = Object.entries(edit).filter(([, v]) => v !== "");
    for (const [pid, v] of updates) {
      const stock = parseInt(v, 10) || 0;
      await supabase.from("outlet_stock").upsert(
        { outlet_id: outletId, product_id: pid, stock },
        { onConflict: "outlet_id,product_id" }
      );
    }
    setEdit({});
    setMsg(`${updates.length} stok outlet disimpan.`);
    loadStock(outletId);
  }

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Stok per outlet</h1>
      <p className="mt-1 text-sm text-slate-500">Atur stok tiap produk untuk masing-masing outlet.</p>

      {outlets.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          Belum ada outlet. Tambahkan di Pengaturan.
        </p>
      ) : (
        <>
          <div className="mt-6">
            <label className="mb-1 block text-sm font-medium text-slate-700">Outlet</label>
            <select value={outletId} onChange={(e) => setOutletId(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Pilih outlet...</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {outletId && (
            <>
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-right">Stok outlet ini</th>
                      <th className="px-4 py-3 text-right">Set</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{stockOf(p.id)}</td>
                        <td className="px-4 py-3 text-right">
                          <input type="number" min="0" value={edit[p.id] ?? ""}
                            onChange={(e) => setEdit({ ...edit, [p.id]: e.target.value })}
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
                            placeholder={String(stockOf(p.id))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button onClick={save}
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                  Simpan stok outlet
                </button>
                {msg && <span className="text-sm text-green-600">{msg}</span>}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
