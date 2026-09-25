"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

export default function OpnamePage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [physical, setPhysical] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .not("stock", "is", null)
      .order("name");
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAll() {
    setSaving(true);
    setMsg("");
    const updates = products
      .filter((p) => physical[p.id] !== undefined && physical[p.id] !== "")
      .map((p) => ({ id: p.id, stock: parseInt(physical[p.id], 10) || 0 }));

    for (const u of updates) {
      await supabase.from("products").update({ stock: u.stock }).eq("id", u.id);
    }
    setSaving(false);
    setPhysical({});
    setMsg(`${updates.length} produk disesuaikan.`);
    load();
  }

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Stok opname</h1>
      <p className="mt-1 text-sm text-slate-500">
        Hitung fisik stok, masukkan jumlah nyata. Kosongkan yang tidak berubah.
      </p>

      {products.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          Tidak ada produk yang melacak stok.
        </p>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3 text-right">Stok sistem</th>
                  <th className="px-4 py-3 text-right">Stok fisik</th>
                  <th className="px-4 py-3 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const val = physical[p.id];
                  const phys = val === "" || val === undefined ? null : parseInt(val, 10) || 0;
                  const diff = phys == null ? null : phys - (p.stock ?? 0);
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{p.stock}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={val ?? ""}
                          onChange={(e) => setPhysical({ ...physical, [p.id]: e.target.value })}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                          placeholder={String(p.stock)}
                        />
                      </td>
                      <td className={`px-4 py-3 text-right ${diff == null ? "text-slate-300" : diff === 0 ? "text-slate-500" : diff > 0 ? "text-green-600" : "text-red-600"}`}>
                        {diff == null ? "—" : diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveAll} disabled={saving}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? "Menyimpan..." : "Simpan penyesuaian"}
            </button>
            {msg && <span className="text-sm text-green-600">{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
