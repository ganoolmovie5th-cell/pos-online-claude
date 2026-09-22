"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

type FormState = {
  id: string | null;
  name: string;
  price: string;
  category_id: string;
  stock: string;
  track: boolean;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  price: "",
  category_id: "",
  stock: "",
  track: false,
};

export default function ProdukPage() {
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
      setErr("Nama produk wajib diisi.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      price,
      category_id: form.category_id || null,
      stock: form.track ? parseInt(form.stock, 10) || 0 : null,
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
    if (!confirm("Hapus produk ini?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  function editProduct(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      category_id: p.category_id ?? "",
      stock: p.stock == null ? "" : String(p.stock),
      track: p.stock != null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Produk</h1>
      <p className="mt-1 text-sm text-slate-500">Kelola item, harga, kategori, dan stok.</p>

      {/* Form */}
      <form onSubmit={saveProduct} className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nama produk</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Kopi Susu"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Harga (Rp)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="18000"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kategori</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Tanpa kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Stok</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.track}
                  onChange={(e) => setForm({ ...form, track: e.target.checked })}
                />
                Lacak
              </label>
              <input
                type="number"
                min="0"
                disabled={!form.track}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                placeholder="Jumlah"
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
            {form.id ? "Simpan perubahan" : "Tambah produk"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Tambah kategori */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <span className="text-sm font-medium text-slate-700">Kategori:</span>
        {categories.map((c) => (
          <span key={c.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {c.name}
          </span>
        ))}
        <div className="ml-auto flex gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            placeholder="Kategori baru"
          />
          <button
            onClick={addCategory}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Tambah
          </button>
        </div>
      </div>

      {/* Daftar produk */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3 text-right">Harga</th>
              <th className="px-4 py-3 text-right">Stok</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Memuat...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Belum ada produk. Tambahkan lewat form di atas.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{catName(p.category_id)}</td>
                  <td className="px-4 py-3 text-right">{rupiah(p.price)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {p.stock == null ? "—" : p.stock}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => editProduct(p)}
                      className="text-brand-700 hover:underline"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="ml-3 text-red-600 hover:underline"
                    >
                      Hapus
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
