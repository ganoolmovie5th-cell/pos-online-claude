"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tanggal } from "@/lib/format";
import type { AuditLog, Profile } from "@/lib/types";

const actionLabel: Record<string, string> = {
  void_sale: "Batalkan transaksi",
  refund: "Retur transaksi",
  delete_product: "Hapus produk",
};

export default function AuditPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, { data: profiles }] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setLogs((rows as AuditLog[]) ?? []);
    const m: Record<string, string> = {};
    ((profiles as Pick<Profile, "id" | "full_name">[]) ?? []).forEach((p) => {
      m[p.id] = p.full_name ?? "—";
    });
    setNames(m);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">Log Aktivitas</h1>
      <p className="mt-1 text-sm text-slate-500">Catatan tindakan penting (maks. 300 terakhir).</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Oleh</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Belum ada aktivitas tercatat.</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-slate-600">{tanggal(l.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{actionLabel[l.action] ?? l.action}</td>
                  <td className="px-4 py-3 text-slate-500">{l.actor_id ? names[l.actor_id] ?? "—" : "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {l.detail ? (
                      <span className="text-xs">{JSON.stringify(l.detail)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
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
