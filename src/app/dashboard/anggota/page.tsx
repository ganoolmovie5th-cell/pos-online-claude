"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tanggal } from "@/lib/format";
import type { Profile } from "@/lib/types";

type Invite = { code: string; role: string; created_at: string };

export default function AnggotaPage() {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("cashier");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data: mine } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.user.id)
        .single();
      setMe((mine as Profile) ?? null);
    }
    const [{ data: m }, { data: inv }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("invites").select("code, role, created_at").order("created_at", { ascending: false }),
    ]);
    setMembers((m as Profile[]) ?? []);
    setInvites((inv as Invite[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = (me?.role ?? "owner") === "owner";

  function genCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  async function createInvite() {
    const code = genCode();
    const { error } = await supabase.from("invites").insert({ code, role });
    if (error) {
      alert("Gagal: " + error.message);
      return;
    }
    load();
  }

  async function removeInvite(code: string) {
    await supabase.from("invites").delete().eq("code", code);
    load();
  }

  if (loading) return <p className="text-center text-slate-400">Memuat...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Anggota</h1>
      <p className="mt-1 text-sm text-slate-500">Kelola staf yang bisa mengakses bisnis ini.</p>

      {!isOwner && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Hanya pemilik yang bisa mengundang anggota.
        </p>
      )}

      {/* Daftar anggota */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Peran</th>
              <th className="px-4 py-3">Bergabung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {m.full_name || "(tanpa nama)"}
                  {m.id === me?.id && <span className="ml-2 text-xs text-slate-400">(kamu)</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {m.role === "owner" ? "Pemilik" : "Kasir"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{tanggal(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Undangan */}
      {isOwner && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Kode undangan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Beri kode ini ke staf. Saat daftar, mereka masukkan kode untuk bergabung.
          </p>

          <div className="mt-4 flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Peran</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="cashier">Kasir</option>
                <option value="owner">Pemilik</option>
              </select>
            </div>
            <button onClick={createInvite}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Buat kode
            </button>
          </div>

          {invites.length > 0 && (
            <ul className="mt-4 space-y-2">
              {invites.map((i) => (
                <li key={i.code} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
                  <span className="font-mono text-lg font-bold tracking-widest text-slate-900">{i.code}</span>
                  <span className="text-xs text-slate-500">{i.role === "owner" ? "Pemilik" : "Kasir"}</span>
                  <button onClick={() => removeInvite(i.code)} className="text-sm text-red-600 hover:underline">
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
