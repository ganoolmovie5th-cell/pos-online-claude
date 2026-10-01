"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Product, ProductVariant } from "@/lib/types";

export default function VarianPage() {
  const supabase = createClient();
  const { t } = useApp();
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
    if (!productId) return alert(t("varian.alertPickProduct"));
    if (!name.trim()) return alert(t("varian.alertName"));
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      name: name.trim(),
      price: parseFloat(price) || 0,
      stock: track ? parseInt(stock, 10) || 0 : null,
    });
    if (error) return alert(t("varian.alertFailed") + error.message);
    setName("");
    setPrice("");
    setStock("");
    load();
  }

  async function remove(id: string) {
    if (!confirm(t("varian.confirmDelete"))) return;
    await supabase.from("product_variants").delete().eq("id", id);
    load();
  }

  const forProduct = variants.filter((v) => v.product_id === productId);
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";

  if (loading) return <p className="text-center text-slate-400 dark:text-slate-400">{t("varian.loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("varian.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("varian.subtitle")}</p>

      <div className="mt-6">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("varian.pickProduct")}</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">{t("varian.pickProductPlaceholder")}</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {productId && (
        <>
          <form onSubmit={add} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("varian.name")}</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("varian.namePlaceholder")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("varian.price")}</label>
              <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={track} onChange={(e) => setTrack(e.target.checked)} />
                {t("varian.trackStock")}
              </label>
              {track && (
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                  className="mt-2 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("varian.stockPlaceholder")} />
              )}
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                {t("varian.add")}
              </button>
            </div>
          </form>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t("varian.colVariant")} {productName(productId)}</th>
                  <th className="px-4 py-3 text-right">{t("varian.colPrice")}</th>
                  <th className="px-4 py-3 text-right">{t("varian.colStock")}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {forProduct.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-400">{t("varian.empty")}</td></tr>
                ) : (
                  forProduct.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{v.name}</td>
                      <td className="px-4 py-3 text-right dark:text-slate-200">{rupiah(v.price)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{v.stock == null ? "—" : v.stock}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => remove(v.id)} className="text-red-600 hover:underline dark:text-red-400">{t("varian.delete")}</button>
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
