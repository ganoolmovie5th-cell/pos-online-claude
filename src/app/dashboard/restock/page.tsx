"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, tanggal } from "@/lib/format";
import type { Product, Supplier } from "@/lib/types";

type StockInRow = {
  id: string;
  qty: number;
  cost_price: number;
  created_at: string;
  product_id: string | null;
  supplier_id: string | null;
};

export default function RestockPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [history, setHistory] = useState<StockInRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [newSupplier, setNewSupplier] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: s }, { data: h }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("stock_ins").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setProducts((p as Product[]) ?? []);
    setSuppliers((s as Supplier[]) ?? []);
    setHistory((h as StockInRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSupplier() {
    const name = newSupplier.trim();
    if (!name) return;
    const { error } = await supabase.from("suppliers").insert({ name });
    if (error) return alert("Gagal: " + error.message);
    setNewSupplier("");
    load();
  }

  async function submitRestock(e: React.FormEvent) {
    e.preventDefault();
    const q = parseInt(qty, 10) || 0;
    if (!productId || q <= 0) return alert("Pilih produk dan isi jumlah.");
    const c = parseFloat(cost) || 0;

    const { error } = await supabase.from("stock_ins").insert({
      product_id: productId,
      supplier_id: supplierId || null,
      qty: q,
      cost_price: c,
    });
    if (error) return alert("Gagal: " + error.message);

    // Tambah stok + update harga modal
    await supabase.rpc("apply_stock_in", { p_product: productId, p_qty: q, p_cost: c });

    setProductId("");
    setSupplierId("");
    setQty("");
    setCost("");
    load();
  }

  const productName = (id: string | null) => products.find((p) => p.id === id)?.name ?? "—";
  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "—";

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">Stok masuk</h1>
      <p className="mt-1 text-sm text-slate-500">Catat barang masuk, tambah stok, dan simpan harga modal.</p>

      <form onSubmit={submitRestock} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Produk</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Pilih produk...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Supplier</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tanpa supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Jumlah masuk</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Harga modal / unit (Rp)</label>
          <input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Kosongkan kalau tetap" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Tambah stok
          </button>
        </div>
      </form>

      {/* Tambah supplier */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <span className="text-sm font-medium text-slate-700">Supplier:</span>
        {suppliers.map((s) => (
          <span key={s.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{s.name}</span>
        ))}
        <div className="ml-auto flex gap-2">
          <input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" placeholder="Supplier baru" />
          <button onClick={addSupplier} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Tambah
          </button>
        </div>
      </div>

      {/* Riwayat */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Produk</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Modal/unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada riwayat stok masuk.</td></tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-3 text-slate-600">{tanggal(h.created_at)}</td>
                  <td className="px-4 py-3 text-slate-800">{productName(h.product_id)}</td>
                  <td className="px-4 py-3 text-slate-500">{supplierName(h.supplier_id)}</td>
                  <td className="px-4 py-3 text-right">+{h.qty}</td>
                  <td className="px-4 py-3 text-right">{rupiah(h.cost_price)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
