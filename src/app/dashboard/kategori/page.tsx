"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import { useApp } from "@/lib/i18n/provider";

export default function KategoriPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cat }, { data: prod }] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("products").select("category_id"),
    ]);
    setCategories((cat as Category[]) ?? []);
    const tally: Record<string, number> = {};
    ((prod as { category_id: string | null }[]) ?? []).forEach((p) => {
      if (p.category_id) tally[p.category_id] = (tally[p.category_id] ?? 0) + 1;
    });
    setCounts(tally);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").insert({ name });
    if (error) {
      setErr(error.message);
      return;
    }
    setNewName("");
    load();
  }

  async function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").update({ name }).eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    setEditId(null);
    load();
  }

  async function removeCategory(id: string) {
    const used = counts[id] ?? 0;
    const msg =
      used > 0
        ? t("kategori.confirmUsed").replace("{n}", String(used))
        : t("kategori.confirmDelete");
    if (!confirm(msg)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("kategori.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("kategori.subtitle")}</p>

      <form onSubmit={addCategory} className="mt-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          placeholder={t("kategori.newPlaceholder")}
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t("kategori.add")}
        </button>
      </form>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("kategori.colName")}</th>
              <th className="px-4 py-3 text-right">{t("kategori.colProducts")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">{t("kategori.loading")}</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">{t("kategori.empty")}</td></tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    {editId === c.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
                        autoFocus
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    ) : (
                      <span className="font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{counts[c.id] ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {editId === c.id ? (
                      <>
                        <button onClick={() => saveEdit(c.id)} className="text-brand-700 hover:underline">{t("kategori.save")}</button>
                        <button onClick={() => setEditId(null)} className="ml-3 text-slate-500 hover:underline">{t("kategori.cancel")}</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditId(c.id); setEditName(c.name); }}
                          className="text-brand-700 hover:underline"
                        >
                          {t("kategori.edit")}
                        </button>
                        <button onClick={() => removeCategory(c.id)} className="ml-3 text-red-600 hover:underline">{t("kategori.delete")}</button>
                      </>
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
