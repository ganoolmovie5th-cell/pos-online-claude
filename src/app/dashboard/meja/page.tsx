"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import type { Business, Product, Table, TableSession } from "@/lib/types";

type SItem = { product_id: string | null; name: string; price: number; cost?: number; qty: number };

const OUTLET_KEY = "pos_active_outlet";

export default function MejaPage() {
  const supabase = createClient();
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTable, setNewTable] = useState("");
  const [activeTable, setActiveTable] = useState<Table | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: s }, { data: p }, { data: user }] = await Promise.all([
      supabase.from("tables").select("*").order("name"),
      supabase.from("table_sessions").select("*").eq("status", "open"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase.auth.getUser(),
    ]);
    setTables((t as Table[]) ?? []);
    setSessions((s as TableSession[]) ?? []);
    setProducts((p as Product[]) ?? []);
    if (user.user) {
      const { data: prof } = await supabase.from("profiles").select("businesses(*)").eq("id", user.user.id).single();
      setBusiness((prof?.businesses as unknown as Business) ?? null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const sessionOf = (tableId: string) => sessions.find((s) => s.table_id === tableId) ?? null;

  async function addTable() {
    const name = newTable.trim();
    if (!name) return;
    const { error } = await supabase.from("tables").insert({ name });
    if (error) return alert("Gagal: " + error.message);
    setNewTable("");
    load();
  }

  async function openSession(table: Table) {
    const existing = sessionOf(table.id);
    if (!existing) {
      const { error } = await supabase.from("table_sessions").insert({ table_id: table.id, items: [] });
      if (error) return alert("Gagal: " + error.message);
      await load();
    }
    setActiveTable(table);
  }

  const activeSession = activeTable ? sessionOf(activeTable.id) : null;
  const items: SItem[] = (activeSession?.items as SItem[]) ?? [];
  const sessionTotal = items.reduce((s, it) => s + it.price * it.qty, 0);

  async function saveItems(next: SItem[]) {
    if (!activeSession) return;
    await supabase.from("table_sessions").update({ items: next }).eq("id", activeSession.id);
    load();
  }

  function addItem(p: Product) {
    const next = [...items];
    const found = next.find((i) => i.product_id === p.id);
    if (found) found.qty += 1;
    else next.push({ product_id: p.id, name: p.name, price: p.price, cost: p.cost_price ?? 0, qty: 1 });
    saveItems(next);
  }

  function changeQty(pid: string | null, delta: number) {
    const next = items
      .map((i) => (i.product_id === pid ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0);
    saveItems(next);
  }

  async function payTable() {
    if (!activeSession || items.length === 0) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const taxPercent = business?.tax_percent ?? 0;
    const scPercent = business?.service_charge_percent ?? 0;
    const subtotal = sessionTotal;
    const tax = Math.round((subtotal * taxPercent) / 100);
    const sc = Math.round((subtotal * scPercent) / 100);
    const total = subtotal + tax + sc;

    const oid = (() => { try { return localStorage.getItem(OUTLET_KEY) || ""; } catch { return ""; } })();
    const { data: sale, error } = await supabase.from("sales").insert({
      cashier_id: userData.user?.id ?? null,
      subtotal, discount: 0, tax, service_charge: sc, total,
      paid: total, change: 0, payment_method: "cash",
      table_id: activeTable?.id ?? null,
      outlet_id: oid || null,
    }).select().single();

    if (error || !sale) {
      setSaving(false);
      return alert("Gagal bayar: " + (error?.message ?? ""));
    }

    await supabase.from("sale_items").insert(
      items.map((it) => ({
        sale_id: sale.id, product_id: it.product_id, name: it.name,
        price: it.price, cost_price: it.cost ?? 0, qty: it.qty, line_total: it.price * it.qty,
      }))
    );
    const dec = items.filter((i) => i.product_id).map((i) => ({ product_id: i.product_id as string, qty: i.qty }));
    if (dec.length > 0) {
      if (oid) {
        await supabase.rpc("decrement_outlet_stock", { p_outlet: oid, items: dec });
      } else {
        await supabase.rpc("decrement_stock", { items: dec });
      }
    }
    await supabase.from("table_sessions").update({
      status: "closed", sale_id: sale.id, closed_at: new Date().toISOString(),
    }).eq("id", activeSession.id);

    setSaving(false);
    setActiveTable(null);
    load();
  }

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  );

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Mode meja</h1>
      <p className="mt-1 text-sm text-slate-500">Buka sesi per meja, tambah pesanan, bayar saat selesai.</p>

      {/* Tambah meja */}
      <div className="mt-4 flex gap-2">
        <input value={newTable} onChange={(e) => setNewTable(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nama meja (Meja 1)" />
        <button onClick={addTable} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          Tambah meja
        </button>
      </div>

      {/* Grid meja */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tables.map((t) => {
          const sess = sessionOf(t.id);
          const total = sess ? ((sess.items as SItem[]) ?? []).reduce((s, i) => s + i.price * i.qty, 0) : 0;
          return (
            <button key={t.id} onClick={() => openSession(t)}
              className={`rounded-xl border p-4 text-left ${sess ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white"}`}>
              <p className="font-semibold text-slate-800">{t.name}</p>
              <p className={`mt-1 text-xs ${sess ? "text-brand-600" : "text-slate-400"}`}>
                {sess ? `Terisi · ${rupiah(total)}` : "Kosong"}
              </p>
            </button>
          );
        })}
        {tables.length === 0 && <p className="text-sm text-slate-400">Belum ada meja.</p>}
      </div>

      {/* Panel sesi meja aktif */}
      {activeTable && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setActiveTable(null)}>
          <div className="grid max-h-[90vh] w-full max-w-3xl gap-4 overflow-auto rounded-xl bg-white p-5 sm:grid-cols-2" onClick={(e) => e.stopPropagation()}>
            {/* Menu */}
            <div>
              <h3 className="font-semibold text-slate-900">{activeTable.name} — tambah pesanan</h3>
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Cari menu..." />
              <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-auto">
                {filtered.map((p) => (
                  <button key={p.id} onClick={() => addItem(p)}
                    className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-brand-400">
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-brand-700">{rupiah(p.price)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Pesanan meja */}
            <div>
              <h3 className="font-semibold text-slate-900">Pesanan</h3>
              {items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Belum ada pesanan.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {items.map((it) => (
                    <li key={it.product_id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{it.name}</span>
                      <button onClick={() => changeQty(it.product_id, -1)} className="h-6 w-6 rounded border border-slate-300">−</button>
                      <span className="w-6 text-center">{it.qty}</span>
                      <button onClick={() => changeQty(it.product_id, 1)} className="h-6 w-6 rounded border border-slate-300">+</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 font-bold">
                <span>Subtotal</span><span>{rupiah(sessionTotal)}</span>
              </div>
              <button onClick={payTable} disabled={items.length === 0 || saving}
                className="mt-4 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? "Memproses..." : "Bayar & tutup meja"}
              </button>
              <button onClick={() => setActiveTable(null)}
                className="mt-2 w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-600">
                Tutup panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
