"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { useApp } from "@/lib/i18n/provider";

type FormState = {
  id: string | null;
  name: string;
  price: string;
  cost: string;
  category_id: string;
  stock: string;
  track: boolean;
  barcode: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  price: "",
  cost: "",
  category_id: "",
  stock: "",
  track: false,
  barcode: "",
};

export default function ProdukPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [newCat, setNewCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prod }, { data: cat }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setProducts((prod as Product[]) ?? []);
    setCategories((cat as Category[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const price = parseFloat(form.price) || 0;
    if (!form.name.trim()) {
      setErr(t("produk.errNameRequired"));
      return;
    }
    const payload = {
      name: form.name.trim(),
      price,
      cost_price: parseFloat(form.cost) || 0,
      category_id: form.category_id || null,
      stock: form.track ? parseInt(form.stock, 10) || 0 : null,
      barcode: form.barcode.trim() || null,
    };
    const res = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    setForm(emptyForm);
    load();
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").insert({ name });
    if (error) {
      setErr(error.message);
      return;
    }
    setNewCat("");
    load();
  }

  async function removeProduct(id: string) {
    if (!confirm(t("produk.confirmDelete"))) return;
    const prod = products.find((p) => p.id === id);
    await supabase.from("products").delete().eq("id", id);
    await supabase.rpc("log_action", {
      p_action: "delete_product",
      p_entity: "products",
      p_entity_id: id,
      p_detail: prod ? { name: prod.name } : null,
    });
    load();
  }

  function editProduct(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      cost: p.cost_price ? String(p.cost_price) : "",
      category_id: p.category_id ?? "",
      stock: p.stock == null ? "" : String(p.stock),
      track: p.stock != null,
      barcode: p.barcode ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("produk.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("produk.subtitle")}</p>

      {/* Form */}
      <form onSubmit={saveProduct} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("produk.nameLabel")}</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder={t("produk.namePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("produk.priceLabel")}</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder={t("produk.pricePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("produk.costLabel")}</label>
            <input
              type="number"
              min="0"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder={t("produk.costPlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("produk.categoryLabel")}</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">{t("produk.noCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("produk.barcodeLabel")}</label>
            <input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder={t("produk.barcodePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("produk.stockLabel")}</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.track}
                  onChange={(e) => setForm({ ...form, track: e.target.checked })}
                />
                {t("produk.track")}
              </label>
              <input
                type="number"
                min="0"
                disabled={!form.track}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
                placeholder={t("produk.stockPlaceholder")}
              />
            </div>
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {form.id ? t("produk.saveChanges") : t("produk.add")}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("produk.cancel")}
            </button>
          )}
        </div>
      </form>

      {/* Tambah kategori */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("produk.categoriesLabel")}</span>
        {categories.map((c) => (
          <span key={c.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {c.name}
          </span>
        ))}
        <div className="ml-auto flex gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t("produk.newCategoryPlaceholder")}
          />
          <button
            onClick={addCategory}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("produk.addCategory")}
          </button>
        </div>
      </div>

      {/* Daftar produk */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("produk.colName")}</th>
              <th className="px-4 py-3">{t("produk.colCategory")}</th>
              <th className="px-4 py-3 text-right">{t("produk.colPrice")}</th>
              <th className="px-4 py-3 text-right">{t("produk.colStock")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("produk.loading")}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("produk.empty")}
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{catName(p.category_id)}</td>
                  <td className="px-4 py-3 text-right dark:text-slate-200">{rupiah(p.price)}</td>
                  <td className="px-4 py-3 text-right">
                    {p.stock == null ? (
                      <span className="text-slate-400">—</span>
                    ) : p.stock <= 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        {t("produk.stockOut")}
                      </span>
                    ) : p.stock <= p.low_stock_threshold ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {t("produk.stockLow").replace("{n}", String(p.stock))}
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300">{p.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => editProduct(p)}
                      className="text-brand-700 hover:underline"
                    >
                      {t("produk.edit")}
                    </button>
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="ml-3 text-red-600 hover:underline"
                    >
                      {t("produk.delete")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
