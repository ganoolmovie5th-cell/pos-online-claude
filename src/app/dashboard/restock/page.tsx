"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, tanggal } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
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
  const { t } = useApp();
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
    if (error) return alert(t("restock.alert.failed") + error.message);
    setNewSupplier("");
    load();
  }

  async function submitRestock(e: React.FormEvent) {
    e.preventDefault();
    const q = parseInt(qty, 10) || 0;
    if (!productId || q <= 0) return alert(t("restock.alert.pickProduct"));
    const c = parseFloat(cost) || 0;

    const { error } = await supabase.from("stock_ins").insert({
      product_id: productId,
      supplier_id: supplierId || null,
      qty: q,
      cost_price: c,
    });
    if (error) return alert(t("restock.alert.failed") + error.message);

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

  if (loading) return <p className="text-center text-slate-400">{t("restock.loading")}</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("restock.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("restock.subtitle")}</p>

      <form onSubmit={submitRestock} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("restock.form.product")}</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">{t("restock.form.selectProduct")}</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("restock.form.supplier")}</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">{t("restock.form.noSupplier")}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("restock.form.qty")}</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("restock.form.qty.placeholder")} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("restock.form.cost")}</label>
          <input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("restock.form.cost.placeholder")} />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {t("restock.form.submit")}
          </button>
        </div>
      </form>

      {/* Tambah supplier */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("restock.supplier.label")}</span>
        {suppliers.map((s) => (
          <span key={s.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{s.name}</span>
        ))}
        <div className="ml-auto flex gap-2">
          <input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("restock.supplier.new.placeholder")} />
          <button onClick={addSupplier} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            {t("restock.supplier.add")}
          </button>
        </div>
      </div>

      {/* Riwayat */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("restock.history.time")}</th>
              <th className="px-4 py-3">{t("restock.history.product")}</th>
              <th className="px-4 py-3">{t("restock.history.supplier")}</th>
              <th className="px-4 py-3 text-right">{t("restock.history.qty")}</th>
              <th className="px-4 py-3 text-right">{t("restock.history.cost")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("restock.history.empty")}</td></tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tanggal(h.created_at)}</td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{productName(h.product_id)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{supplierName(h.supplier_id)}</td>
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
