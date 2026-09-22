"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import type { Business, CartLine, Product } from "@/lib/types";

export default function KasirPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("cash");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prod }, { data: user }] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.auth.getUser(),
    ]);
    setProducts((prod as Product[]) ?? []);
    if (user.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("businesses(*)")
        .eq("id", user.user.id)
        .single();
      setBusiness((profile?.businesses as unknown as Business) ?? null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  function addToCart(p: Product) {
    setCart((prev) => {
      const found = prev.find((l) => l.product_id === p.id);
      if (found) {
        return prev.map((l) =>
          l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product_id !== id)
        : prev.map((l) => (l.product_id === id ? { ...l, qty } : l))
    );
  }

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const disc = Math.min(parseFloat(discount) || 0, subtotal);
  const taxPercent = business?.tax_percent ?? 0;
  const tax = Math.round(((subtotal - disc) * taxPercent) / 100);
  const total = subtotal - disc + tax;
  const paidNum = parseFloat(paid) || 0;
  const change = paidNum - total;

  async function checkout() {
    if (cart.length === 0) return;
    if (method === "cash" && paidNum < total) {
      setDone("");
      alert("Nominal bayar kurang dari total.");
      return;
    }
    setSaving(true);
    setDone("");

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;

    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .insert({
        cashier_id: uid,
        subtotal,
        discount: disc,
        tax,
        total,
        paid: method === "cash" ? paidNum : total,
        change: method === "cash" ? Math.max(change, 0) : 0,
        payment_method: method,
      })
      .select()
      .single();

    if (saleErr || !sale) {
      setSaving(false);
      alert("Gagal menyimpan transaksi: " + (saleErr?.message ?? "unknown"));
      return;
    }

    const items = cart.map((l) => ({
      sale_id: sale.id,
      product_id: l.product_id,
      name: l.name,
      price: l.price,
      qty: l.qty,
      line_total: l.price * l.qty,
    }));
    const { error: itemErr } = await supabase.from("sale_items").insert(items);

    setSaving(false);
    if (itemErr) {
      alert("Transaksi tersimpan tapi item gagal: " + itemErr.message);
      return;
    }

    setCart([]);
    setDiscount("");
    setPaid("");
    setDone(`Transaksi tersimpan. Kembalian ${rupiah(Math.max(change, 0))}.`);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
      {/* Katalog */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kasir</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari produk..."
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {loading ? (
          <p className="mt-8 text-center text-slate-400">Memuat produk...</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-slate-400">
            Tidak ada produk. Tambahkan di menu Produk dulu.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-brand-400 hover:shadow-sm"
              >
                <p className="font-medium text-slate-800">{p.name}</p>
                <p className="mt-1 text-sm text-brand-700">{rupiah(p.price)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Keranjang */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Keranjang</h2>
        {cart.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Belum ada item.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {cart.map((l) => (
              <li key={l.product_id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{l.name}</p>
                  <p className="text-xs text-slate-500">{rupiah(l.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQty(l.product_id, l.qty - 1)}
                    className="h-7 w-7 rounded border border-slate-300 text-slate-600"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm">{l.qty}</span>
                  <button
                    onClick={() => setQty(l.product_id, l.qty + 1)}
                    className="h-7 w-7 rounded border border-slate-300 text-slate-600"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{rupiah(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Diskon</span>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-28 rounded border border-slate-300 px-2 py-1 text-right"
              placeholder="0"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pajak ({taxPercent}%)</span>
            <span>{rupiah(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{rupiah(total)}</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Transfer</option>
            <option value="ewallet">E-wallet</option>
          </select>
          {method === "cash" && (
            <div>
              <input
                type="number"
                min="0"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nominal bayar"
              />
              {paidNum > 0 && (
                <p className="mt-1 text-right text-sm text-slate-500">
                  Kembalian: {rupiah(Math.max(change, 0))}
                </p>
              )}
            </div>
          )}
          <button
            onClick={checkout}
            disabled={cart.length === 0 || saving}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Bayar & simpan"}
          </button>
          {done && <p className="text-center text-sm text-green-600">{done}</p>}
        </div>
      </div>
    </div>
  );
}
