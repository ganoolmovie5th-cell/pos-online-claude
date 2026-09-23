"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import { enqueue, loadQueue, clearQueue } from "@/lib/offline";
import type { Business, CartLine, Customer, Outlet, Product, Voucher } from "@/lib/types";

const PARK_KEY = "pos_parked_carts";
const OUTLET_KEY = "pos_active_outlet";

type Parked = { id: string; label: string; cart: CartLine[] };

export default function KasirPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("cash");
  const [customerId, setCustomerId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");
  const [parked, setParked] = useState<Parked[]>([]);
  const [pendingSync, setPendingSync] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prod }, { data: cust }, { data: outl }, { data: user }] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("customers").select("*").order("name"),
      supabase.from("outlets").select("*").order("name"),
      supabase.auth.getUser(),
    ]);
    setProducts((prod as Product[]) ?? []);
    setCustomers((cust as Customer[]) ?? []);
    setOutlets((outl as Outlet[]) ?? []);
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
    try {
      setParked(JSON.parse(localStorage.getItem(PARK_KEY) || "[]"));
      setOutletId(localStorage.getItem(OUTLET_KEY) || "");
      setPendingSync(loadQueue().length);
    } catch {}
  }, [load]);

  // Auto-sync antrean offline saat online
  useEffect(() => {
    const sync = async () => {
      const q = loadQueue();
      if (q.length === 0) return;
      for (const item of q) {
        const { data: sale } = await supabase.from("sales").insert(item.sale).select().single();
        if (sale) {
          const items = item.items.map((it) => ({ ...it, sale_id: sale.id }));
          await supabase.from("sale_items").insert(items);
          await supabase.rpc("decrement_stock", { items: item.decrement });
        }
      }
      clearQueue();
      setPendingSync(0);
      load();
    };
    window.addEventListener("online", sync);
    if (navigator.onLine) sync();
    return () => window.removeEventListener("online", sync);
  }, [supabase, load]);

  function saveOutlet(id: string) {
    setOutletId(id);
    localStorage.setItem(OUTLET_KEY, id);
  }

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.barcode ?? "").includes(query)
      ),
    [products, query]
  );

  function onScanInput(val: string) {
    setQuery(val);
    const hit = products.find((p) => p.barcode && p.barcode === val.trim());
    if (hit) {
      addToCart(hit);
      setQuery("");
    }
  }

  function addToCart(p: Product) {
    setCart((prev) => {
      const found = prev.find((l) => l.product_id === p.id);
      if (found) {
        return prev.map((l) => (l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.price, qty: 1, discount: 0 }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product_id !== id)
        : prev.map((l) => (l.product_id === id ? { ...l, qty } : l))
    );
  }

  function setLineDiscount(id: string, d: number) {
    setCart((prev) => prev.map((l) => (l.product_id === id ? { ...l, discount: Math.max(d, 0) } : l)));
  }

  // ---- Perhitungan ----
  const lineTotal = (l: CartLine) => Math.max(l.price * l.qty - l.discount, 0);
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0);

  // diskon transaksi (nominal atau persen)
  const discInput = parseFloat(discount) || 0;
  const discFromMode = discountMode === "percent" ? (subtotal * discInput) / 100 : discInput;

  // voucher
  const voucherDisc = voucher
    ? voucher.kind === "percent"
      ? (subtotal * Number(voucher.value)) / 100
      : Number(voucher.value)
    : 0;

  // tebus poin
  const cust = customers.find((c) => c.id === customerId) ?? null;
  const pointValue = business?.point_value ?? 100;
  const wantRedeem = Math.min(parseInt(redeemPoints, 10) || 0, cust?.points ?? 0);
  const redeemDisc = wantRedeem * pointValue;

  const totalDiscount = Math.min(discFromMode + voucherDisc + redeemDisc, subtotal);
  const afterDiscount = subtotal - totalDiscount;

  const taxPercent = business?.tax_percent ?? 0;
  const scPercent = business?.service_charge_percent ?? 0;
  const tax = Math.round((afterDiscount * taxPercent) / 100);
  const serviceCharge = Math.round((afterDiscount * scPercent) / 100);
  const total = afterDiscount + tax + serviceCharge;

  const paidNum = parseFloat(paid) || 0;
  const change = paidNum - total;

  // poin didapat
  const ppa = business?.points_per_amount ?? 1000;
  const pointsEarned = customerId && ppa > 0 ? Math.floor(afterDiscount / ppa) : 0;

  function applyVoucher() {
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;
    supabase
      .from("vouchers")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setVoucher(data as Voucher);
        else alert("Voucher tidak ditemukan atau nonaktif.");
      });
  }

  function parkCart() {
    if (cart.length === 0) return;
    const label = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const next = [...parked, { id: crypto.randomUUID(), label, cart }];
    setParked(next);
    localStorage.setItem(PARK_KEY, JSON.stringify(next));
    resetCart();
  }

  function resumeParked(p: Parked) {
    setCart(p.cart);
    removeParked(p.id);
  }

  function removeParked(id: string) {
    const next = parked.filter((p) => p.id !== id);
    setParked(next);
    localStorage.setItem(PARK_KEY, JSON.stringify(next));
  }

  function resetCart() {
    setCart([]);
    setDiscount("");
    setPaid("");
    setCustomerId("");
    setVoucher(null);
    setVoucherCode("");
    setRedeemPoints("");
  }

  async function checkout() {
    if (cart.length === 0) return;
    if (method === "cash" && paidNum < total) {
      alert("Nominal bayar kurang dari total.");
      return;
    }
    if (method === "debt" && !customerId) {
      alert("Pilih pelanggan dulu untuk transaksi kasbon.");
      return;
    }
    setSaving(true);
    setDone("");

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    const { data: openShift } = await supabase
      .from("shifts").select("id").is("closed_at", null)
      .order("opened_at", { ascending: false }).limit(1).maybeSingle();

    const isDebt = method === "debt";
    const salePayload = {
      cashier_id: uid,
      subtotal,
      discount: totalDiscount,
      tax,
      service_charge: serviceCharge,
      total,
      paid: isDebt ? 0 : method === "cash" ? paidNum : total,
      change: method === "cash" ? Math.max(change, 0) : 0,
      payment_method: method,
      shift_id: openShift?.id ?? null,
      customer_id: customerId || null,
      is_debt: isDebt,
      points_earned: pointsEarned,
      points_redeemed: wantRedeem,
      voucher_code: voucher?.code ?? null,
      outlet_id: outletId || null,
    };
    const itemsPayload = cart.map((l) => ({
      product_id: l.product_id,
      name: l.name,
      price: l.price,
      qty: l.qty,
      line_total: lineTotal(l),
    }));
    const decrement = cart.map((l) => ({ product_id: l.product_id, qty: l.qty }));

    const { data: sale, error: saleErr } = await supabase
      .from("sales").insert(salePayload).select().single();

    if (saleErr || !sale) {
      // Kemungkinan offline: antre.
      enqueue({ sale: salePayload, items: itemsPayload, decrement });
      setPendingSync(loadQueue().length);
      setSaving(false);
      resetCart();
      setDone("Offline. Transaksi diantre, terkirim otomatis saat online.");
      return;
    }

    const items = itemsPayload.map((it) => ({ ...it, sale_id: sale.id }));
    const { error: itemErr } = await supabase.from("sale_items").insert(items);
    if (itemErr) {
      setSaving(false);
      alert("Transaksi tersimpan tapi item gagal: " + itemErr.message);
      return;
    }

    await supabase.rpc("decrement_stock", { items: decrement });

    if (isDebt) {
      await supabase.from("debts").insert({
        customer_id: customerId, sale_id: sale.id, amount: total, paid: 0, status: "open",
      });
    }

    // Loyalty: tambah poin didapat, kurangi poin ditebus
    if (customerId && (pointsEarned > 0 || wantRedeem > 0)) {
      await supabase.rpc("adjust_points", {
        p_customer: customerId,
        p_delta: pointsEarned - wantRedeem,
      });
    }

    setSaving(false);
    resetCart();
    setDone(
      isDebt
        ? "Kasbon tercatat. Total utang " + rupiah(total) + "."
        : `Transaksi tersimpan. Kembalian ${rupiah(Math.max(change, 0))}.` +
          (pointsEarned > 0 ? ` +${pointsEarned} poin.` : "")
    );
    load();
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_380px]">
      {/* Katalog */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Kasir</h1>
          {outlets.length > 0 && (
            <select value={outletId} onChange={(e) => saveOutlet(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              <option value="">Semua outlet</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </div>
        {pendingSync > 0 && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {pendingSync} transaksi menunggu sinkronisasi (offline).
          </p>
        )}
        <input
          value={query}
          onChange={(e) => onScanInput(e.target.value)}
          placeholder="Cari produk atau scan barcode..."
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {/* Transaksi tertahan */}
        {parked.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {parked.map((p) => (
              <div key={p.id} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs">
                <button onClick={() => resumeParked(p)} className="font-medium text-slate-700">
                  Tahan {p.label} ({p.cart.length})
                </button>
                <button onClick={() => removeParked(p.id)} className="text-red-500">×</button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-center text-slate-400">Memuat produk...</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-slate-400">Tidak ada produk. Tambahkan di menu Produk dulu.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((p) => {
              const out = p.stock != null && p.stock <= 0;
              const low = p.stock != null && p.stock > 0 && p.stock <= p.low_stock_threshold;
              return (
                <button key={p.id} onClick={() => addToCart(p)} disabled={out}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-brand-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="mt-1 text-sm text-brand-700">{rupiah(p.price)}</p>
                  {p.stock != null && (
                    <p className={`mt-1 text-xs ${out ? "text-red-600" : low ? "text-amber-600" : "text-slate-400"}`}>
                      {out ? "Stok habis" : low ? `Stok menipis: ${p.stock}` : `Stok: ${p.stock}`}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Keranjang */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Keranjang</h2>
          {cart.length > 0 && (
            <button onClick={parkCart} className="text-xs font-medium text-brand-700 hover:underline">
              Tahan
            </button>
          )}
        </div>
        {cart.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Belum ada item.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {cart.map((l) => (
              <li key={l.product_id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{l.name}</p>
                    <p className="text-xs text-slate-500">{rupiah(l.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(l.product_id, l.qty - 1)} className="h-7 w-7 rounded border border-slate-300 text-slate-600">−</button>
                    <span className="w-7 text-center text-sm">{l.qty}</span>
                    <button onClick={() => setQty(l.product_id, l.qty + 1)} className="h-7 w-7 rounded border border-slate-300 text-slate-600">+</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-xs text-slate-400">Diskon item</span>
                  <input type="number" min="0" value={l.discount || ""} onChange={(e) => setLineDiscount(l.product_id, parseFloat(e.target.value) || 0)}
                    className="w-24 rounded border border-slate-200 px-2 py-0.5 text-right text-xs" placeholder="0" />
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

          {/* Diskon transaksi */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Diskon</span>
            <div className="flex items-center gap-1">
              <select value={discountMode} onChange={(e) => setDiscountMode(e.target.value as "amount" | "percent")}
                className="rounded border border-slate-300 px-1 py-1 text-xs">
                <option value="amount">Rp</option>
                <option value="percent">%</option>
              </select>
              <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)}
                className="w-20 rounded border border-slate-300 px-2 py-1 text-right" placeholder="0" />
            </div>
          </div>

          {/* Voucher */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Voucher</span>
            <div className="flex items-center gap-1">
              <input value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)}
                className="w-24 rounded border border-slate-300 px-2 py-1 text-xs uppercase" placeholder="KODE" />
              <button onClick={applyVoucher} className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">Pakai</button>
            </div>
          </div>
          {voucher && <div className="flex justify-between text-xs text-green-600"><span>{voucher.code}</span><span>-{rupiah(voucherDisc)}</span></div>}

          {/* Tebus poin */}
          {cust && cust.points > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tebus poin ({cust.points})</span>
              <input type="number" min="0" max={cust.points} value={redeemPoints} onChange={(e) => setRedeemPoints(e.target.value)}
                className="w-20 rounded border border-slate-300 px-2 py-1 text-right" placeholder="0" />
            </div>
          )}
          {redeemDisc > 0 && <div className="flex justify-between text-xs text-green-600"><span>Diskon poin</span><span>-{rupiah(redeemDisc)}</span></div>}

          {tax > 0 && <div className="flex justify-between"><span className="text-slate-500">Pajak ({taxPercent}%)</span><span>{rupiah(tax)}</span></div>}
          {serviceCharge > 0 && <div className="flex justify-between"><span className="text-slate-500">Service ({scPercent}%)</span><span>{rupiah(serviceCharge)}</span></div>}

          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
            <span>Total</span><span>{rupiah(total)}</span>
          </div>
          {customerId && pointsEarned > 0 && (
            <p className="text-right text-xs text-brand-600">Dapat +{pointsEarned} poin</p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Transfer</option>
            <option value="ewallet">E-wallet</option>
            <option value="debt">Kasbon (utang)</option>
          </select>

          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tanpa pelanggan</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.points} poin)</option>
            ))}
          </select>

          {method === "cash" && (
            <div>
              <input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nominal bayar" />
              {paidNum > 0 && (
                <p className="mt-1 text-right text-sm text-slate-500">Kembalian: {rupiah(Math.max(change, 0))}</p>
              )}
            </div>
          )}
          <button onClick={checkout} disabled={cart.length === 0 || saving}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {saving ? "Menyimpan..." : "Bayar & simpan"}
          </button>
          {done && <p className="text-center text-sm text-green-600">{done}</p>}
        </div>
      </div>
    </div>
  );
}
