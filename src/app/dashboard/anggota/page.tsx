"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tanggal } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Profile } from "@/lib/types";

type Invite = { code: string; role: string; created_at: string };

export default function AnggotaPage() {
  const { t } = useApp();
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
      alert(t("anggota.error") + error.message);
      return;
    }
    load();
  }

  async function removeInvite(code: string) {
    await supabase.from("invites").delete().eq("code", code);
    load();
  }

  if (loading) return <p className="text-center text-slate-400">{t("anggota.loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("anggota.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("anggota.subtitle")}</p>

      {!isOwner && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t("anggota.ownerOnly")}
        </p>
      )}

      {/* Daftar anggota */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("anggota.col.name")}</th>
              <th className="px-4 py-3">{t("anggota.col.role")}</th>
              <th className="px-4 py-3">{t("anggota.col.joined")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                  {m.full_name || t("anggota.noName")}
                  {m.id === me?.id && <span className="ml-2 text-xs text-slate-400">{t("anggota.you")}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {m.role === "owner" ? t("anggota.role.owner") : t("anggota.role.cashier")}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{tanggal(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Undangan */}
      {isOwner && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("anggota.invite.title")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("anggota.invite.desc")}
          </p>

          <div className="mt-4 flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("anggota.invite.roleLabel")}</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value="cashier">{t("anggota.role.cashier")}</option>
                <option value="owner">{t("anggota.role.owner")}</option>
              </select>
            </div>
            <button onClick={createInvite}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              {t("anggota.invite.create")}
            </button>
          </div>

          {invites.length > 0 && (
            <ul className="mt-4 space-y-2">
              {invites.map((i) => (
                <li key={i.code} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-700">
                  <span className="font-mono text-lg font-bold tracking-widest text-slate-900 dark:text-white">{i.code}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{i.role === "owner" ? t("anggota.role.owner") : t("anggota.role.cashier")}</span>
                  <button onClick={() => removeInvite(i.code)} className="text-sm text-red-600 hover:underline">
                    {t("anggota.invite.remove")}
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
