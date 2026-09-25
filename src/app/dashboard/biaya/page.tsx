"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import type { Expense } from "@/lib/types";

const KATEGORI = ["Sewa", "Listrik & Air", "Gaji", "Bahan Baku", "Transport", "Pemasaran", "Lainnya"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BiayaPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(KATEGORI[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [spentAt, setSpentAt] = useState(todayStr());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("spent_at", { ascending: false })
      .limit(100);
    setExpenses((data as Expense[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return alert("Isi nominal.");
    const { error } = await supabase.from("expenses").insert({
      category,
      amount: amt,
      note: note.trim() || null,
      spent_at: spentAt,
    });
    if (error) return alert("Gagal: " + error.message);
    setAmount("");
    setNote("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus pengeluaran ini?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Pengeluaran</h1>
      <p className="mt-1 text-sm text-slate-500">Catat biaya operasional untuk hitung laba bersih.</p>

      <form onSubmit={add} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nominal (Rp)</label>
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tanggal</label>
          <input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Catatan</label>
          <input value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Opsional" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Tambah pengeluaran
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Total pengeluaran (100 terakhir)</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{rupiah(total)}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Catatan</th>
              <th className="px-4 py-3 text-right">Nominal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada pengeluaran.</td></tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-slate-600">{e.spent_at}</td>
                  <td className="px-4 py-3 text-slate-700">{e.category}</td>
                  <td className="px-4 py-3 text-slate-500">{e.note ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{rupiah(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(e.id)} className="text-red-600 hover:underline">Hapus</button>
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
