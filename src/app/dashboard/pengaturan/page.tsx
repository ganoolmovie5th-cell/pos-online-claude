"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Business, Outlet } from "@/lib/types";

export default function PengaturanPage() {
  const supabase = createClient();
  const [biz, setBiz] = useState<Business | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [newOutlet, setNewOutlet] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [canEdit, setCanEdit] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, businesses(*)")
        .eq("id", user.user.id)
        .single();
      setBiz((profile?.businesses as unknown as Business) ?? null);
      setCanEdit((profile?.role ?? "owner") === "owner");
    }
    const { data: o } = await supabase.from("outlets").select("*").order("name");
    setOutlets((o as Outlet[]) ?? []);
    setLoading(false);
  }, [supabase]);

  async function addOutlet() {
    const name = newOutlet.trim();
    if (!name) return;
    const { error } = await supabase.from("outlets").insert({ name });
    if (error) return alert("Gagal: " + error.message);
    setNewOutlet("");
    load();
  }

  async function removeOutlet(id: string) {
    if (!confirm("Hapus outlet ini?")) return;
    await supabase.from("outlets").delete().eq("id", id);
    load();
  }

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!biz) return;
    setSaving(true);
    setMsg("");
    const { error } = await supabase
      .from("businesses")
      .update({
        name: biz.name,
        currency: biz.currency,
        tax_percent: biz.tax_percent,
        service_charge_percent: biz.service_charge_percent,
        points_per_amount: biz.points_per_amount,
        point_value: biz.point_value,
        address: biz.address,
        phone: biz.phone,
        receipt_footer: biz.receipt_footer,
      })
      .eq("id", biz.id);
    setSaving(false);
    setMsg(error ? "Gagal: " + error.message : "Tersimpan.");
  }

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;
  if (!biz) return <p className="text-center text-slate-400">Bisnis tidak ditemukan.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Pengaturan bisnis</h1>
      <p className="mt-1 text-sm text-slate-500">Info ini tampil di struk pelanggan.</p>

      {!canEdit && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Hanya pemilik yang bisa mengubah pengaturan.
        </p>
      )}

      <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <Field label="Nama bisnis">
          <input value={biz.name} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mata uang">
            <input value={biz.currency} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, currency: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
          </Field>
          <Field label="Pajak (%)">
            <input type="number" min="0" step="0.5" value={biz.tax_percent} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, tax_percent: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Service charge (%)">
            <input type="number" min="0" step="0.5" value={biz.service_charge_percent} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, service_charge_percent: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
          </Field>
          <Field label="Rp per 1 poin">
            <input type="number" min="0" value={biz.points_per_amount} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, points_per_amount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
          </Field>
          <Field label="Nilai 1 poin (Rp)">
            <input type="number" min="0" value={biz.point_value} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, point_value: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
          </Field>
        </div>

        <Field label="Nomor telepon">
          <input value={biz.phone ?? ""} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, phone: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            placeholder="0812xxxx" />
        </Field>

        <Field label="Alamat">
          <textarea rows={2} value={biz.address ?? ""} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, address: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            placeholder="Alamat toko" />
        </Field>

        <Field label="Catatan bawah struk">
          <input value={biz.receipt_footer ?? ""} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, receipt_footer: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            placeholder="Terima kasih sudah berbelanja!" />
        </Field>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            {msg && <span className="text-sm text-slate-600">{msg}</span>}
          </div>
        )}
      </form>

      {/* Outlet / cabang */}
      {canEdit && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Outlet / cabang</h2>
          <p className="mt-1 text-sm text-slate-500">Kelompokkan transaksi per cabang. Pilih outlet aktif di kasir.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {outlets.map((o) => (
              <span key={o.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {o.name}
                <button onClick={() => removeOutlet(o.id)} className="text-red-500">×</button>
              </span>
            ))}
            {outlets.length === 0 && <span className="text-sm text-slate-400">Belum ada outlet.</span>}
          </div>
          <div className="mt-4 flex gap-2">
            <input value={newOutlet} onChange={(e) => setNewOutlet(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nama outlet" />
            <button onClick={addOutlet} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Tambah
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
