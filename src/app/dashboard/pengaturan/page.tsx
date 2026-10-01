"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/i18n/provider";
import type { Business, Outlet } from "@/lib/types";

export default function PengaturanPage() {
  const { t } = useApp();
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
    if (error) return alert(t("pengaturan.error") + error.message);
    setNewOutlet("");
    load();
  }

  async function removeOutlet(id: string) {
    if (!confirm(t("pengaturan.outlet.confirmRemove"))) return;
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
        cash_rounding: biz.cash_rounding,
        address: biz.address,
        phone: biz.phone,
        receipt_footer: biz.receipt_footer,
      })
      .eq("id", biz.id);
    setSaving(false);
    setMsg(error ? t("pengaturan.error") + error.message : t("pengaturan.saved"));
  }

  if (loading) return <p className="text-center text-slate-400">{t("pengaturan.loading")}</p>;
  if (!biz) return <p className="text-center text-slate-400">{t("pengaturan.notFound")}</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("pengaturan.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("pengaturan.subtitle")}</p>

      {!canEdit && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t("pengaturan.ownerOnly")}
        </p>
      )}

      <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <Field label={t("pengaturan.field.name")}>
          <input value={biz.name} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("pengaturan.field.currency")}>
            <input value={biz.currency} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, currency: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </Field>
          <Field label={t("pengaturan.field.tax")}>
            <input type="number" min="0" step="0.5" value={biz.tax_percent} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, tax_percent: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("pengaturan.field.service")}>
            <input type="number" min="0" step="0.5" value={biz.service_charge_percent} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, service_charge_percent: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </Field>
          <Field label={t("pengaturan.field.pointsPerAmount")}>
            <input type="number" min="0" value={biz.points_per_amount} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, points_per_amount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </Field>
          <Field label={t("pengaturan.field.pointValue")}>
            <input type="number" min="0" value={biz.point_value} disabled={!canEdit}
              onChange={(e) => setBiz({ ...biz, point_value: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </Field>
        </div>

        <Field label={t("pengaturan.field.rounding")}>
          <select value={biz.cash_rounding} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, cash_rounding: parseInt(e.target.value, 10) || 0 })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value={0}>{t("pengaturan.rounding.none")}</option>
            <option value={100}>{t("pengaturan.rounding.100")}</option>
            <option value={500}>{t("pengaturan.rounding.500")}</option>
            <option value={1000}>{t("pengaturan.rounding.1000")}</option>
          </select>
          <p className="mt-1 text-xs text-slate-400">{t("pengaturan.rounding.hint")}</p>
        </Field>

        <Field label={t("pengaturan.field.phone")}>
          <input value={biz.phone ?? ""} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, phone: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t("pengaturan.field.phone.placeholder")} />
        </Field>

        <Field label={t("pengaturan.field.address")}>
          <textarea rows={2} value={biz.address ?? ""} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, address: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t("pengaturan.field.address.placeholder")} />
        </Field>

        <Field label={t("pengaturan.field.footer")}>
          <input value={biz.receipt_footer ?? ""} disabled={!canEdit}
            onChange={(e) => setBiz({ ...biz, receipt_footer: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t("pengaturan.field.footer.placeholder")} />
        </Field>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? t("pengaturan.saving") : t("pengaturan.save")}
            </button>
            {msg && <span className="text-sm text-slate-600 dark:text-slate-300">{msg}</span>}
          </div>
        )}
      </form>

      {/* Outlet / cabang */}
      {canEdit && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("pengaturan.outlet.title")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("pengaturan.outlet.subtitle")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {outlets.map((o) => (
              <span key={o.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {o.name}
                <button onClick={() => removeOutlet(o.id)} className="text-red-500">×</button>
              </span>
            ))}
            {outlets.length === 0 && <span className="text-sm text-slate-400">{t("pengaturan.outlet.empty")}</span>}
          </div>
          <div className="mt-4 flex gap-2">
            <input value={newOutlet} onChange={(e) => setNewOutlet(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t("pengaturan.outlet.placeholder")} />
            <button onClick={addOutlet} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              {t("pengaturan.outlet.add")}
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
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}
