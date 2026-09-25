"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import type { Bundle, BundleItem, Product } from "@/lib/types";

type Line = { product_id: string; qty: number };

export default function BundlePage() {
  const supabase = createClient();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [items, setItems] = useState<BundleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", qty: 1 }]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: bi }, { data: p }] = await Promise.all([
      supabase.from("bundles").select("*").order("created_at", { ascending: false }),
      supabase.from("bundle_items").select("*"),
      supabase.from("products").select("*").order("name"),
    ]);
    setBundles((b as Bundle[]) ?? []);
    setItems((bi as BundleItem[]) ?? []);
    setProducts((p as Product[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const productName = (id: string | null) => products.find((p) => p.id === id)?.name ?? "—";
  const itemsOf = (bundleId: string) => items.filter((i) => i.bundle_id === bundleId);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price) || 0;
    const valid = lines.filter((l) => l.product_id && l.qty > 0);
    if (!name.trim() || p <= 0 || valid.length === 0) {
      alert("Isi nama, harga paket, dan minimal satu produk.");
      return;
    }
    const { data: bundle, error } = await supabase
      .from("bundles")
      .insert({ name: name.trim(), price: p })
      .select()
      .single();
    if (error || !bundle) return alert("Gagal: " + (error?.message ?? ""));

    const rows = valid.map((l) => ({
      bundle_id: (bundle as Bundle).id,
      product_id: l.product_id,
      qty: l.qty,
    }));
    await supabase.from("bundle_items").insert(rows);

    setName("");
    setPrice("");
    setLines([{ product_id: "", qty: 1 }]);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus paket ini?")) return;
    await supabase.from("bundles").delete().eq("id", id);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Paket / bundling</h1>
      <p className="mt-1 text-sm text-slate-500">Gabungkan beberapa produk jadi satu paket dengan harga khusus.</p>

      <form onSubmit={create} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nama paket</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Paket Hemat A" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Harga paket (Rp)</label>
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Isi paket</label>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <select value={l.product_id}
                  onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, product_id: e.target.value } : x))}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Pilih produk...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min="1" value={l.qty}
                  onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, qty: parseInt(e.target.value, 10) || 1 } : x))}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm text-right" />
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))}
                    className="rounded-lg border border-slate-300 px-3 text-red-500">×</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLines([...lines, { product_id: "", qty: 1 }])}
            className="mt-2 text-sm font-medium text-brand-700 hover:underline">+ Tambah produk</button>
        </div>

        <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Simpan paket
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-center text-slate-400">Memuat...</p>
        ) : bundles.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Belum ada paket.</p>
        ) : (
          bundles.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  <p className="text-sm text-brand-700">{rupiah(b.price)}</p>
                </div>
                <button onClick={() => remove(b.id)} className="text-sm text-red-600 hover:underline">Hapus</button>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-500">
                {itemsOf(b.id).map((it) => (
                  <li key={it.id}>{it.qty}× {productName(it.product_id)}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
