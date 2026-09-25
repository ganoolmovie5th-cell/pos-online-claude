"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), { ssr: false });
import { enqueue, loadQueue, clearQueue } from "@/lib/offline";

const CATALOG_KEY = "pos_catalog_cache";
import type { Bundle, BundleItem, Business, CartLine, Customer, Outlet, Product, ProductVariant, Voucher } from "@/lib/types";

const PARK_KEY = "pos_parked_carts";
const OUTLET_KEY = "pos_active_outlet";

type Parked = { id: string; label: string; cart: CartLine[] };

export default function KasirPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantPick, setVariantPick] = useState<Product | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletStock, setOutletStock] = useState<Record<string, number>>({});
  const [business, setBusiness] = useState<Business | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("cash");
  const [splitCash, setSplitCash] = useState("");
  const [splitNon, setSplitNon] = useState("");
  const [splitNonMethod, setSplitNonMethod] = useState("qris");
  const [customerId, setCustomerId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");
  const [parked, setParked] = useState<Parked[]>([]);
  const [pendingSync, setPendingSync] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prod }, { data: cust }, { data: outl }, { data: bnd }, { data: bndItems }, { data: user }] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.from("customers").select("*").order("name"),
      supabase.from("outlets").select("*").order("name"),
      supabase.from("bundles").select("*").eq("is_active", true).order("name"),
      supabase.from("bundle_items").select("*"),
      supabase.auth.getUser(),
    ]);
    const { data: vars } = await supabase.from("product_variants").select("*");

    if (prod) {
      // Online: pakai data server + simpan cache untuk offline
      setProducts(prod as Product[]);
      setBundles((bnd as Bundle[]) ?? []);
      setBundleItems((bndItems as BundleItem[]) ?? []);
      setVariants((vars as ProductVariant[]) ?? []);
      try {
        localStorage.setItem(CATALOG_KEY, JSON.stringify({ products: prod, bundles: bnd, bundleItems: bndItems, variants: vars }));
      } catch {}
    } else {
      // Offline: pakai cache katalog terakhir
      try {
        const c = JSON.parse(localStorage.getItem(CATALOG_KEY) || "null");
        setProducts(c?.products ?? []);
        setBundles(c?.bundles ?? []);
        setBundleItems(c?.bundleItems ?? []);
        setVariants(c?.variants ?? []);
      } catch {}
    }
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
      const failed: typeof q = [];
      for (const item of q) {
        const { data: sale, error } = await supabase.from("sales").insert(item.sale).select().single();
        if (error || !sale) {
          failed.push(item); // gagal -> pertahankan, jangan buang
          continue;
        }
        const items = item.items.map((it) => ({ ...it, sale_id: sale.id }));
        await supabase.from("sale_items").insert(items);
        const oid = (item.sale as { outlet_id?: string | null }).outlet_id;
        if (item.decrement.length > 0) {
          if (oid) {
            await supabase.rpc("decrement_outlet_stock", { p_outlet: oid, items: item.decrement });
          } else {
            await supabase.rpc("decrement_stock", { items: item.decrement });
          }
        }
        if (item.variantDecrement && item.variantDecrement.length > 0) {
          await supabase.rpc("decrement_variant_stock", { items: item.variantDecrement });
        }
      }
      // Simpan hanya yang masih gagal (bukan hapus semua)
      clearQueue();
      failed.forEach((f) => enqueue(f));
      setPendingSync(failed.length);
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

  // Muat stok per outlet saat outlet aktif berubah
  useEffect(() => {
    if (!outletId) {
      setOutletStock({});
      return;
    }
    supabase
      .from("outlet_stock")
      .select("product_id, stock")
      .eq("outlet_id", outletId)
      .then(({ data }) => {
        const m: Record<string, number> = {};
        ((data as { product_id: string; stock: number }[]) ?? []).forEach((r) => {
          m[r.product_id] = r.stock;
        });
        setOutletStock(m);
      });
  }, [outletId, supabase, done]);

  // Stok efektif produk: kalau outlet aktif, pakai stok outlet; else stok global
  const effStock = (p: Product): number | null => {
    if (p.stock == null) return null; // produk tak melacak stok -> tak dibatasi
    // Outlet aktif: pakai stok outlet kalau sudah pernah di-set,
    // else fallback ke stok global (produk baru belum tentu punya entri outlet).
    if (outletId) return outletStock[p.id] ?? p.stock;
    return p.stock;
  };

  // true kalau angka stok berasal dari entri outlet spesifik (bukan fallback global)
  const isOutletEntry = (p: Product) => !!outletId && outletStock[p.id] !== undefined;

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

  function onCameraDetect(code: string) {
    const hit = products.find((p) => p.barcode && p.barcode === code.trim());
    if (hit) {
      addToCart(hit);
      setScanning(false);
    }
  }

  // Key UI unik: varian > produk > bundle(nama)
  const lineKey = (l: CartLine) =>
    l.variant_id ? "var:" + l.variant_id : l.product_id ?? "bundle:" + l.name;

  function hasVariants(p: Product) {
    return variants.some((v) => v.product_id === p.id);
  }

  function addToCart(p: Product) {
    if (hasVariants(p)) {
      setVariantPick(p);
      return;
    }
    setCart((prev) => {
      const found = prev.find((l) => l.product_id === p.id && !l.variant_id);
      if (found) {
        return prev.map((l) => (l.product_id === p.id && !l.variant_id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.price, cost: p.cost_price ?? 0, qty: 1, discount: 0 }];
    });
  }

  function addVariant(p: Product, v: ProductVariant) {
    setCart((prev) => {
      const found = prev.find((l) => l.variant_id === v.id);
      if (found) {
        return prev.map((l) => (l.variant_id === v.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, {
        product_id: p.id,
        variant_id: v.id,
        variant_name: v.name,
        name: `${p.name} — ${v.name}`,
        price: v.price,
        cost: p.cost_price ?? 0, // varian pakai modal produk induk
        qty: 1,
        discount: 0,
      }];
    });
    setVariantPick(null);
  }

  function addBundle(b: Bundle) {
    const components = bundleItems
      .filter((i) => i.bundle_id === b.id && i.product_id)
      .map((i) => {
        const prod = products.find((p) => p.id === i.product_id);
        return { product_id: i.product_id as string, qty: i.qty, cost: prod?.cost_price ?? 0 };
      });
    const bundleCost = components.reduce((s, c) => s + c.cost * c.qty, 0);
    setCart((prev) => {
      const key = "bundle:" + b.name;
      const found = prev.find((l) => lineKey(l) === key);
      if (found) {
        return prev.map((l) => (lineKey(l) === key ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product_id: null, name: b.name, price: b.price, cost: bundleCost, qty: 1, discount: 0, components }];
    });
  }

  function setQty(key: string, qty: number) {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => lineKey(l) !== key)
        : prev.map((l) => (lineKey(l) === key ? { ...l, qty } : l))
    );
  }

  function setLineDiscount(key: string, d: number) {
    setCart((prev) => prev.map((l) => (lineKey(l) === key ? { ...l, discount: Math.max(d, 0) } : l)));
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

  // Diskon non-poin didahulukan; poin hanya menutup sisa agar tak ada poin hangus.
  const nonPointDisc = Math.min(discFromMode + voucherDisc, subtotal);
  const maxRedeemDisc = subtotal - nonPointDisc;
  const effectiveRedeemDisc = Math.min(redeemDisc, maxRedeemDisc);
  const effectiveRedeemPoints = pointValue > 0 ? Math.ceil(effectiveRedeemDisc / pointValue) : 0;
  const totalDiscount = nonPointDisc + effectiveRedeemDisc;
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
    setSplitCash("");
    setSplitNon("");
  }

  const splitCashNum = parseFloat(splitCash) || 0;
  const splitNonNum = parseFloat(splitNon) || 0;
  const splitSum = splitCashNum + splitNonNum;

  async function checkout() {
    if (cart.length === 0) return;
    if (method === "cash" && paidNum < total) {
      alert("Nominal bayar kurang dari total.");
      return;
    }
    if (method === "split" && splitSum < total) {
      alert(`Total bayar (${rupiah(splitSum)}) kurang dari ${rupiah(total)}.`);
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
    const isSplit = method === "split";
    const payments = isSplit
      ? [
          { method: "cash", amount: splitCashNum },
          { method: splitNonMethod, amount: splitNonNum },
        ].filter((p) => p.amount > 0)
      : null;
    const salePayload = {
      cashier_id: uid,
      subtotal,
      discount: totalDiscount,
      tax,
      service_charge: serviceCharge,
      total,
      paid: isDebt ? 0 : method === "cash" ? paidNum : isSplit ? splitSum : total,
      change: method === "cash" ? Math.max(change, 0) : isSplit ? Math.max(splitSum - total, 0) : 0,
      payment_method: method,
      payments,
      shift_id: openShift?.id ?? null,
      customer_id: customerId || null,
      is_debt: isDebt,
      points_earned: pointsEarned,
      points_redeemed: effectiveRedeemPoints,
      voucher_code: voucher?.code ?? null,
      outlet_id: outletId || null,
    };
    const itemsPayload = cart.map((l) => ({
      product_id: l.product_id,
      variant_id: l.variant_id ?? null,
      variant_name: l.variant_name ?? null,
      name: l.name,
      price: l.price,
      cost_price: l.cost ?? 0,
      qty: l.qty,
      line_total: lineTotal(l),
    }));
    // Kurangi stok produk biasa + komponen bundle (varian ditangani terpisah)
    const decrement: { product_id: string; qty: number }[] = [];
    const variantDecrement: { variant_id: string; qty: number }[] = [];
    cart.forEach((l) => {
      if (l.variant_id) {
        variantDecrement.push({ variant_id: l.variant_id, qty: l.qty });
      } else if (l.product_id) {
        decrement.push({ product_id: l.product_id, qty: l.qty });
      } else if (l.components) {
        l.components.forEach((c) => decrement.push({ product_id: c.product_id, qty: c.qty * l.qty }));
      }
    });

    const { data: sale, error: saleErr } = await supabase
      .from("sales").insert(salePayload).select().single();

    if (saleErr || !sale) {
      // Kemungkinan offline: antre.
      enqueue({ sale: salePayload, items: itemsPayload, decrement, variantDecrement });
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

    if (decrement.length > 0) {
      if (outletId) {
        await supabase.rpc("decrement_outlet_stock", { p_outlet: outletId, items: decrement });
      } else {
        await supabase.rpc("decrement_stock", { items: decrement });
      }
    }
    if (variantDecrement.length > 0) {
      await supabase.rpc("decrement_variant_stock", { items: variantDecrement });
    }

    if (isDebt) {
      await supabase.from("debts").insert({
        customer_id: customerId, sale_id: sale.id, amount: total, paid: 0, status: "open",
      });
    }

    // Loyalty: tambah poin didapat, kurangi poin ditebus
    if (customerId && (pointsEarned > 0 || effectiveRedeemPoints > 0)) {
      await supabase.rpc("adjust_points", {
        p_customer: customerId,
        p_delta: pointsEarned - effectiveRedeemPoints,
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
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(e) => onScanInput(e.target.value)}
            placeholder="Cari produk atau scan barcode..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button onClick={() => setScanning(true)}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            title="Scan pakai kamera">
            📷 Scan
          </button>
        </div>
        {scanning && <BarcodeScanner onDetected={onCameraDetect} onClose={() => setScanning(false)} />}
        {variantPick && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setVariantPick(null)}>
            <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-slate-900">Pilih varian — {variantPick.name}</h3>
              <div className="mt-4 grid gap-2">
                {variants.filter((v) => v.product_id === variantPick.id).map((v) => {
                  const out = v.stock != null && v.stock <= 0;
                  return (
                    <button key={v.id} onClick={() => addVariant(variantPick, v)} disabled={out}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-left hover:border-brand-400 disabled:opacity-50">
                      <span className="text-sm font-medium text-slate-800">{v.name}</span>
                      <span className="text-sm text-brand-700">{rupiah(v.price)}{out ? " (habis)" : ""}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setVariantPick(null)} className="mt-4 w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-600">Batal</button>
            </div>
          </div>
        )}

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
              const st = effStock(p);
              const tracked = st != null;
              const out = tracked && st <= 0;
              const low = tracked && st > 0 && st <= p.low_stock_threshold;
              return (
                <button key={p.id} onClick={() => addToCart(p)} disabled={out}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-brand-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="mt-1 text-sm text-brand-700">{rupiah(p.price)}</p>
                  {tracked && (
                    <p className={`mt-1 text-xs ${out ? "text-red-600" : low ? "text-amber-600" : "text-slate-400"}`}>
                      {out ? "Stok habis" : low ? `Stok menipis: ${st}` : `Stok: ${st}`}
                      {outletId && !isOutletEntry(p) && <span className="text-slate-400"> (global)</span>}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Paket / bundle */}
        {bundles.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-semibold text-slate-500">Paket</h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {bundles.map((b) => (
                <button key={b.id} onClick={() => addBundle(b)}
                  className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-left hover:border-brand-400 hover:shadow-sm">
                  <p className="font-medium text-slate-800">{b.name}</p>
                  <p className="mt-1 text-sm text-brand-700">{rupiah(b.price)}</p>
                  <p className="mt-1 text-xs text-brand-600">Paket</p>
                </button>
              ))}
            </div>
          </>
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
            {cart.map((l) => {
              const key = lineKey(l);
              return (
                <li key={key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {l.name}
                        {l.product_id === null && <span className="ml-1 text-xs text-brand-600">(paket)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{rupiah(l.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(key, l.qty - 1)} className="h-7 w-7 rounded border border-slate-300 text-slate-600">−</button>
                      <span className="w-7 text-center text-sm">{l.qty}</span>
                      <button onClick={() => setQty(key, l.qty + 1)} className="h-7 w-7 rounded border border-slate-300 text-slate-600">+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-1">
                    <span className="text-xs text-slate-400">Diskon item</span>
                    <input type="number" min="0" value={l.discount || ""} onChange={(e) => setLineDiscount(key, parseFloat(e.target.value) || 0)}
                      className="w-24 rounded border border-slate-200 px-2 py-0.5 text-right text-xs" placeholder="0" />
                  </div>
                </li>
              );
            })}
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
            <option value="split">Bayar campuran (split)</option>
            <option value="debt">Kasbon (utang)</option>
          </select>

          {method === "split" && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-slate-500">Tunai</span>
                <input type="number" min="0" value={splitCash} onChange={(e) => setSplitCash(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm text-right" placeholder="0" />
              </div>
              <div className="flex items-center gap-2">
                <select value={splitNonMethod} onChange={(e) => setSplitNonMethod(e.target.value)}
                  className="w-16 rounded border border-slate-300 px-1 py-1 text-xs">
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer</option>
                  <option value="ewallet">E-wallet</option>
                </select>
                <input type="number" min="0" value={splitNon} onChange={(e) => setSplitNon(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm text-right" placeholder="0" />
              </div>
              <p className={`text-right text-xs ${splitSum >= total ? "text-green-600" : "text-amber-600"}`}>
                Terbayar {rupiah(splitSum)} / {rupiah(total)}
              </p>
            </div>
          )}

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
