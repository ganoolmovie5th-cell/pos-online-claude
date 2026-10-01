"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Bundle, BundleItem, Product } from "@/lib/types";

type Line = { product_id: string; qty: number };

export default function BundlePage() {
  const { t } = useApp();
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
      alert(t("bundle.alert.fill"));
      return;
    }
    const { data: bundle, error } = await supabase
      .from("bundles")
      .insert({ name: name.trim(), price: p })
      .select()
      .single();
    if (error || !bundle) return alert(t("bundle.alert.failed") + (error?.message ?? ""));

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
    if (!confirm(t("bundle.confirm.delete"))) return;
    await supabase.from("bundles").delete().eq("id", id);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("bundle.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("bundle.subtitle")}</p>

      <form onSubmit={create} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("bundle.form.name")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("bundle.form.name.placeholder")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("bundle.form.price")}</label>
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("bundle.form.price.placeholder")} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("bundle.form.items")}</label>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <select value={l.product_id}
                  onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, product_id: e.target.value } : x))}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="">{t("bundle.form.selectProduct")}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min="1" value={l.qty}
                  onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, qty: parseInt(e.target.value, 10) || 1 } : x))}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm text-right dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))}
                    className="rounded-lg border border-slate-300 px-3 text-red-500 dark:border-slate-700">×</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLines([...lines, { product_id: "", qty: 1 }])}
            className="mt-2 text-sm font-medium text-brand-700 hover:underline">{t("bundle.form.addProduct")}</button>
        </div>

        <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          {t("bundle.form.save")}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-center text-slate-400">{t("bundle.loading")}</p>
        ) : bundles.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">{t("bundle.empty")}</p>
        ) : (
          bundles.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{b.name}</p>
                  <p className="text-sm text-brand-700">{rupiah(b.price)}</p>
                </div>
                <button onClick={() => remove(b.id)} className="text-sm text-red-600 hover:underline">{t("bundle.delete")}</button>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
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
