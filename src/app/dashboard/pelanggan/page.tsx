"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, tanggal } from "@/lib/format";
import type { Customer, Debt, Sale } from "@/lib/types";

export default function PelangganPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
  const [purchases, setPurchases] = useState<Record<string, Sale[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: d }] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("debts").select("*").order("created_at", { ascending: false }),
    ]);
    setCustomers((c as Customer[]) ?? []);
    setDebts((d as Debt[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase
      .from("customers")
      .insert({ name: name.trim(), phone: phone.trim() || null });
    if (error) {
      alert("Gagal: " + error.message);
      return;
    }
    setName("");
    setPhone("");
    load();
  }

  function debtsOf(customerId: string) {
    return debts.filter((d) => d.customer_id === customerId);
  }

  function outstanding(customerId: string) {
    return debtsOf(customerId)
      .filter((d) => d.status === "open")
      .reduce((s, d) => s + (Number(d.amount) - Number(d.paid)), 0);
  }

  async function payDebt(debt: Debt) {
    const amt = parseFloat(payAmount[debt.id]) || 0;
    if (amt <= 0) return;
    const remaining = Number(debt.amount) - Number(debt.paid);
    const pay = Math.min(amt, remaining);
    const newPaid = Number(debt.paid) + pay;
    const status = newPaid >= Number(debt.amount) ? "paid" : "open";

    const { error } = await supabase
      .from("debts")
      .update({ paid: newPaid, status })
      .eq("id", debt.id);
    if (error) {
      alert("Gagal: " + error.message);
      return;
    }
    await supabase.from("debt_payments").insert({ debt_id: debt.id, amount: pay });
    setPayAmount({ ...payAmount, [debt.id]: "" });
    load();
  }

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Pelanggan</h1>
      <p className="mt-1 text-sm text-slate-500">Kelola pelanggan dan catatan kasbon (utang).</p>

      <form onSubmit={addCustomer} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nama pelanggan" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Telepon</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0812xxxx" />
        </div>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Tambah
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {customers.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            Belum ada pelanggan.
          </p>
        ) : (
          customers.map((c) => {
            const owe = outstanding(c.id);
            const list = debtsOf(c.id);
            const isOpen = openId === c.id;
            return (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white">
                <button
                  onClick={async () => {
                    const nextOpen = isOpen ? null : c.id;
                    setOpenId(nextOpen);
                    if (nextOpen && !purchases[c.id]) {
                      const { data } = await supabase
                        .from("sales")
                        .select("*")
                        .eq("customer_id", c.id)
                        .order("created_at", { ascending: false })
                        .limit(20);
                      setPurchases((prev) => ({ ...prev, [c.id]: (data as Sale[]) ?? [] }));
                    }
                  }}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <p className="font-medium text-slate-800">{c.name}</p>
                    {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                  </div>
                  <div className="text-right">
                    {owe > 0 ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        Utang {rupiah(owe)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Lunas
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <p className="mb-3 text-sm text-slate-600">
                      Saldo poin: <strong className="text-brand-700">{c.points}</strong>
                    </p>

                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Kasbon</h4>
                    {list.length === 0 ? (
                      <p className="text-sm text-slate-400">Belum ada kasbon.</p>
                    ) : (
                      <ul className="space-y-3">
                        {list.map((d) => {
                          const remaining = Number(d.amount) - Number(d.paid);
                          return (
                            <li key={d.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">{tanggal(d.created_at)}</span>
                                <span className={d.status === "paid" ? "text-green-600" : "text-red-600"}>
                                  {d.status === "paid" ? "Lunas" : "Sisa " + rupiah(remaining)}
                                </span>
                              </div>
                              <div className="mt-1 text-slate-600">
                                Total {rupiah(d.amount)} · Dibayar {rupiah(d.paid)}
                              </div>
                              {d.status === "open" && (
                                <div className="mt-2 flex gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={payAmount[d.id] ?? ""}
                                    onChange={(e) => setPayAmount({ ...payAmount, [d.id]: e.target.value })}
                                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                    placeholder="Nominal bayar"
                                  />
                                  <button
                                    onClick={() => payDebt(d)}
                                    className="shrink-0 rounded bg-brand-600 px-3 py-1 text-sm font-semibold text-white hover:bg-brand-700"
                                  >
                                    Bayar
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Riwayat pembelian</h4>
                    {!purchases[c.id] ? (
                      <p className="text-sm text-slate-400">Memuat...</p>
                    ) : purchases[c.id].length === 0 ? (
                      <p className="text-sm text-slate-400">Belum ada pembelian.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {purchases[c.id].map((s) => (
                          <li key={s.id} className="flex justify-between">
                            <span className="text-slate-500">{tanggal(s.created_at)}</span>
                            <span className="font-medium text-slate-800">{rupiah(s.total)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
