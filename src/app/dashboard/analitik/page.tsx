"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Sale } from "@/lib/types";

export default function AnalitikPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [sales, setSales] = useState<Pick<Sale, "total" | "created_at" | "status">[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const { data } = await supabase
      .from("sales")
      .select("total, created_at, status")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });
    setSales((data as Pick<Sale, "total" | "created_at" | "status">[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const valid = useMemo(() => sales.filter((s) => s.status !== "voided"), [sales]);

  const stats = useMemo(() => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const start7 = new Date(now.getTime() - 7 * day);
    const start14 = new Date(now.getTime() - 14 * day);

    let curOmzet = 0, curCount = 0, prevOmzet = 0, prevCount = 0;
    const byHour = new Array(24).fill(0);

    for (const s of valid) {
      const d = new Date(s.created_at);
      const t = Number(s.total);
      if (d >= start7) {
        curOmzet += t;
        curCount += 1;
        byHour[d.getHours()] += t;
      } else if (d >= start14) {
        prevOmzet += t;
        prevCount += 1;
      }
    }

    const aov = curCount > 0 ? curOmzet / curCount : 0;
    const omzetDelta = prevOmzet > 0 ? ((curOmzet - prevOmzet) / prevOmzet) * 100 : null;
    const countDelta = prevCount > 0 ? ((curCount - prevCount) / prevCount) * 100 : null;
    const maxHour = Math.max(...byHour, 1);

    return { curOmzet, curCount, prevOmzet, prevCount, aov, omzetDelta, countDelta, byHour, maxHour };
  }, [valid]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("analitik.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("analitik.subtitle")}</p>

      {loading ? (
        <p className="mt-8 text-center text-slate-400">{t("analitik.loading")}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card
              label={t("analitik.card.omzet")}
              value={rupiah(stats.curOmzet)}
              delta={stats.omzetDelta}
              deltaSuffix={t("analitik.vsPrev")}
            />
            <Card
              label={t("analitik.card.count")}
              value={String(stats.curCount)}
              delta={stats.countDelta}
              deltaSuffix={t("analitik.vsPrev")}
            />
            <Card label={t("analitik.card.avg")} value={rupiah(stats.aov)} delta={null} deltaSuffix={t("analitik.vsPrev")} />
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("analitik.busyHours")}</h2>
            {stats.curOmzet === 0 ? (
              <p className="mt-3 text-sm text-slate-400">{t("analitik.noSales")}</p>
            ) : (
              <div className="mt-4 flex items-end gap-1" style={{ height: 160 }}>
                {stats.byHour.map((v, h) => (
                  <div key={h} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-brand-500"
                      style={{ height: `${(v / stats.maxHour) * 130}px` }}
                      title={`${h}:00 — ${rupiah(v)}`}
                    />
                    {h % 3 === 0 && <span className="text-[10px] text-slate-400">{h}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, delta, deltaSuffix }: { label: string; value: string; delta: number | null; deltaSuffix: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      {delta != null && (
        <p className={`mt-1 text-sm font-medium ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}{deltaSuffix}
        </p>
      )}
    </div>
  );
}
