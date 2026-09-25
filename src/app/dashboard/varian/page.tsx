"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";

export default function VarianPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [track, setTrack] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("product_variants").select("*").order("created_at"),
    ]);
    setProducts((p as Product[]) ?? []);
    setVariants((v as ProductVariant[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return alert("Pilih produk dulu.");
    if (!name.trim()) return alert("Isi nama varian.");
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      name: name.trim(),
      price: parseFloat(price) || 0,
      stock: track ? parseInt(stock, 10) || 0 : null,
    });
    if (error) return alert("Gagal: " + error.message);
    setName("");
    setPrice("");
    setStock("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus varian ini?")) return;
    await supabase.from("product_variants").delete().eq("id", id);
    load();
  }

  const forProduct = variants.filter((v) => v.product_id === productId);
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Varian produk</h1>
      <p className="mt-1 text-sm text-slate-500">Ukuran, warna, atau tipe dengan harga/stok berbeda.</p>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-medium text-slate-700">Pilih produk</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Pilih produk...</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {productId && (
        <>
          <form onSubmit={add} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nama varian</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="M / Merah" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Harga (Rp)</label>
              <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={track} onChange={(e) => setTrack(e.target.checked)} />
                Lacak stok varian
              </label>
              {track && (
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                  className="mt-2 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Jumlah stok" />
              )}
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Tambah varian
              </button>
            </div>
          </form>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Varian {productName(productId)}</th>
                  <th className="px-4 py-3 text-right">Harga</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forProduct.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Belum ada varian.</td></tr>
                ) : (
                  forProduct.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{v.name}</td>
                      <td className="px-4 py-3 text-right">{rupiah(v.price)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{v.stock == null ? "—" : v.stock}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => remove(v.id)} className="text-red-600 hover:underline">Hapus</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
