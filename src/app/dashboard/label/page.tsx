"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/format";
import { useApp } from "@/lib/i18n/provider";
import type { Business, Product } from "@/lib/types";

export default function LabelPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: p } = await supabase.from("products").select("*").order("name");
    setProducts((p as Product[]) ?? []);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data: prof } = await supabase.from("profiles").select("businesses(*)").eq("id", user.user.id).single();
      setBusiness((prof?.businesses as unknown as Business) ?? null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function setCount(id: string, n: number) {
    setSelected((prev) => {
      const next = { ...prev };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }

  // Daftar label yang akan dicetak (produk x jumlah)
  const labels: Product[] = [];
  Object.entries(selected).forEach(([id, n]) => {
    const p = products.find((x) => x.id === id);
    if (p) for (let i = 0; i < n; i++) labels.push(p);
  });

  if (loading) return <p className="text-center text-slate-400">{t("label.loading")}</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("label.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("label.subtitle")}</p>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("label.col.product")}</th>
                <th className="px-4 py-3">{t("label.col.barcode")}</th>
                <th className="px-4 py-3 text-right">{t("label.col.price")}</th>
                <th className="px-4 py-3 text-right">{t("label.col.count")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.barcode ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{rupiah(p.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" min="0" value={selected[p.id] ?? ""}
                      onChange={(e) => setCount(p.id, parseInt(e.target.value, 10) || 0)}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-right dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="0" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={() => window.print()} disabled={labels.length === 0}
          className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {t("label.print.prefix")} {labels.length} {t("label.print.suffix")}
        </button>
      </div>

      {/* Area cetak */}
      <div id="labels" className="mt-6 grid grid-cols-3 gap-3">
        {labels.map((p, i) => (
          <Label key={i} businessName={business?.name ?? ""} product={p} />
        ))}
      </div>
    </div>
  );
}

function Label({ businessName, product }: { businessName: string; product: Product }) {
  const { t } = useApp();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!product.barcode || !svgRef.current) return;
    (async () => {
      const JsBarcode = (await import("jsbarcode")).default;
      try {
        JsBarcode(svgRef.current, product.barcode as string, {
          format: "CODE128",
          width: 1.5,
          height: 36,
          fontSize: 11,
          margin: 4,
        });
      } catch {
        // barcode invalid, abaikan
      }
    })();
  }, [product.barcode]);

  return (
    <div className="rounded border border-slate-300 p-2 text-center dark:border-slate-700">
      <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{product.name}</p>
      <p className="text-sm font-bold">{rupiah(product.price)}</p>
      {product.barcode ? (
        <svg ref={svgRef} className="mx-auto" />
      ) : (
        <p className="text-[10px] text-slate-400">{t("label.noBarcode")}</p>
      )}
      {businessName && <p className="truncate text-[9px] text-slate-400">{businessName}</p>}
    </div>
  );
}
