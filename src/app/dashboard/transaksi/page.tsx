"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, tanggal } from "@/lib/format";
import { receiptText } from "@/lib/receipt";
import { buildEscposReceipt, connectThermal, printThermal } from "@/lib/thermal";
import { useApp } from "@/lib/i18n/provider";
import type { Business, Sale, SaleItem } from "@/lib/types";

const methodKey: Record<string, string> = {
  cash: "transaksi.method.cash",
  qris: "transaksi.method.qris",
  transfer: "transaksi.method.transfer",
  ewallet: "transaksi.method.ewallet",
};

export default function TransaksiPage() {
  const { t } = useApp();
  const supabase = createClient();
  const [sales, setSales] = useState<Sale[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  // retur
  const [refundSale, setRefundSale] = useState<Sale | null>(null);
  const [refundItems, setRefundItems] = useState<SaleItem[]>([]);
  const [refundQty, setRefundQty] = useState<Record<string, number>>({});
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);

  // filter
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: user }] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.auth.getUser(),
    ]);
    setSales((s as Sale[]) ?? []);
    if (user.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("businesses(*)")
        .eq("id", user.user.id)
        .single();
      setBusiness((profile?.businesses as unknown as Business) ?? null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const methodLabel = (m: string) => (methodKey[m] ? t(methodKey[m]) : m);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (method && s.payment_method !== method) return false;
      if (status && s.status !== status) return false;
      const d = new Date(s.created_at);
      if (from && d < new Date(from + "T00:00:00")) return false;
      if (to && d > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [sales, method, status, from, to]);

  async function openReceipt(sale: Sale) {
    setActive(sale);
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
    setItems((data as SaleItem[]) ?? []);
  }

  async function voidSale(sale: Sale) {
    if (!confirm(t("transaksi.confirm.void"))) return;
    // void_sale menangani: stok (produk/varian/outlet), poin, kasbon, status
    const { error } = await supabase.rpc("void_sale", { p_sale_id: sale.id });
    if (error) {
      alert(t("transaksi.alert.failed") + error.message);
      return;
    }
    setActive(null);
    load();
  }

  async function openRefund(sale: Sale) {
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
    setRefundItems((data as SaleItem[]) ?? []);
    setRefundQty({});
    setRefundReason("");
    setRefundSale(sale);
  }

  async function submitRefund() {
    if (!refundSale) return;
    const payload = Object.entries(refundQty)
      .filter(([, q]) => q > 0)
      .map(([sale_item_id, qty]) => ({ sale_item_id, qty }));
    if (payload.length === 0) {
      alert(t("transaksi.alert.pickRefundItem"));
      return;
    }
    setRefundBusy(true);
    const { error } = await supabase.rpc("refund_sale_items", {
      p_sale_id: refundSale.id,
      p_items: payload,
      p_reason: refundReason.trim() || null,
    });
    setRefundBusy(false);
    if (error) {
      alert(t("transaksi.alert.failed") + error.message);
      return;
    }
    setRefundSale(null);
    load();
  }

  function shareWa() {
    if (!active) return;
    const txt = receiptText(business, active, items);
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
  }

  async function printThermalReceipt() {
    if (!active) return;
    try {
      const conn = await connectThermal();
      const data = buildEscposReceipt(business, active, items);
      await printThermal(conn, data);
    } catch (e) {
      alert(t("transaksi.alert.thermalFailed") + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function copyReceipt() {
    if (!active) return;
    const txt = receiptText(business, active, items);
    try {
      await navigator.clipboard.writeText(txt);
      alert(t("transaksi.alert.receiptCopied"));
    } catch {
      alert(t("transaksi.alert.copyFailed"));
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("transaksi.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("transaksi.subtitle")}</p>

      {/* Filter */}
      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("transaksi.filter.from")}</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("transaksi.filter.to")}</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("transaksi.filter.method")}</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">{t("transaksi.filter.all")}</option>
            <option value="cash">{t("transaksi.method.cash")}</option>
            <option value="qris">{t("transaksi.method.qris")}</option>
            <option value="transfer">{t("transaksi.method.transfer")}</option>
            <option value="ewallet">{t("transaksi.method.ewallet")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("transaksi.filter.status")}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">{t("transaksi.filter.all")}</option>
            <option value="completed">{t("transaksi.status.completed")}</option>
            <option value="voided">{t("transaksi.status.voided")}</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("transaksi.col.time")}</th>
              <th className="px-4 py-3">{t("transaksi.col.method")}</th>
              <th className="px-4 py-3">{t("transaksi.col.status")}</th>
              <th className="px-4 py-3 text-right">{t("transaksi.col.total")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("transaksi.loading")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("transaksi.empty")}</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className={s.status === "voided" ? "opacity-50" : ""}>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{tanggal(s.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{methodLabel(s.payment_method)}</td>
                  <td className="px-4 py-3">
                    {s.status === "voided" ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{t("transaksi.status.voided")}</span>
                    ) : s.status === "refunded" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{t("transaksi.status.refunded")}</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{t("transaksi.status.completed")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{rupiah(s.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openReceipt(s)} className="text-brand-700 hover:underline">{t("transaksi.action.receipt")}</button>
                    {s.status !== "voided" && s.status !== "refunded" && (
                      <button onClick={() => openRefund(s)} className="ml-3 text-amber-700 hover:underline">{t("transaksi.action.refund")}</button>
                    )}
                    {s.status !== "voided" && (
                      <button onClick={() => voidSale(s)} className="ml-3 text-red-600 hover:underline">{t("transaksi.action.void")}</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal struk */}
      {active && (
        <div className="receipt-modal fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div id="receipt" className="text-sm">
              <div className="text-center">
                <p className="text-base font-bold text-slate-900 dark:text-white">{business?.name ?? t("transaksi.receipt.default")}</p>
                {business?.address && <p className="text-xs text-slate-500 dark:text-slate-400">{business.address}</p>}
                {business?.phone && <p className="text-xs text-slate-500 dark:text-slate-400">{business.phone}</p>}
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tanggal(active.created_at)}</p>
                {active.status === "voided" && (
                  <p className="mt-1 text-xs font-bold text-red-600">{t("transaksi.receipt.voided")}</p>
                )}
              </div>
              <div className="my-3 border-t border-dashed border-slate-300 dark:border-slate-700" />
              <ul className="space-y-1">
                {items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">{it.qty}× {it.name}</span>
                    <span>{rupiah(it.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="my-3 border-t border-dashed border-slate-300 dark:border-slate-700" />
              <div className="space-y-1">
                <Row label={t("transaksi.receipt.subtotal")} val={rupiah(active.subtotal)} />
                {active.discount > 0 && <Row label={t("transaksi.receipt.discount")} val={"-" + rupiah(active.discount)} />}
                {active.tax > 0 && <Row label={t("transaksi.receipt.tax")} val={rupiah(active.tax)} />}
                {active.service_charge > 0 && <Row label={t("transaksi.receipt.service")} val={rupiah(active.service_charge)} />}
                <div className="flex justify-between font-bold">
                  <span>{t("transaksi.receipt.total")}</span><span>{rupiah(active.total)}</span>
                </div>
                {active.points_earned > 0 && <Row label={t("transaksi.receipt.pointsEarned")} val={"+" + active.points_earned} />}
                {active.points_redeemed > 0 && <Row label={t("transaksi.receipt.pointsRedeemed")} val={"-" + active.points_redeemed} />}
                {active.payment_method === "cash" && (
                  <>
                    <Row label={t("transaksi.receipt.paid")} val={rupiah(active.paid)} />
                    <Row label={t("transaksi.receipt.change")} val={rupiah(active.change)} />
                  </>
                )}
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">
                {business?.receipt_footer || t("transaksi.receipt.footer")}
              </p>
            </div>

            <div className="no-print mt-6 grid grid-cols-2 gap-2">
              <button onClick={() => window.print()} className="rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("transaksi.receipt.print")}</button>
              <button onClick={shareWa} className="rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">{t("transaksi.receipt.whatsapp")}</button>
              <button onClick={printThermalReceipt} className="rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{t("transaksi.receipt.thermal")}</button>
              <button onClick={copyReceipt} className="rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{t("transaksi.receipt.copy")}</button>
              <button onClick={() => setActive(null)} className="col-span-2 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{t("transaksi.receipt.close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal retur */}
      {refundSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("transaksi.refund.title")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("transaksi.refund.subtitle")}</p>

            <div className="mt-4 space-y-2">
              {refundItems.map((it) => {
                const sisa = it.qty - (it.refunded_qty ?? 0);
                const unit = it.qty > 0 ? it.line_total / it.qty : 0;
                return (
                  <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{it.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {rupiah(unit)} · {t("transaksi.refund.sold")} {it.qty}
                        {(it.refunded_qty ?? 0) > 0 && `${t("transaksi.refund.alreadyRefunded")} ${it.refunded_qty}`}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={sisa}
                      disabled={sisa <= 0}
                      value={refundQty[it.id] ?? 0}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(sisa, parseInt(e.target.value, 10) || 0));
                        setRefundQty((q) => ({ ...q, [it.id]: v }));
                      }}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("transaksi.refund.reason")}</label>
              <input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder={t("transaksi.refund.reason.placeholder")}
              />
            </div>

            <div className="mt-3 flex justify-between text-sm font-semibold text-slate-800 dark:text-slate-100">
              <span>{t("transaksi.refund.total")}</span>
              <span>
                {rupiah(
                  refundItems.reduce((sum, it) => {
                    const unit = it.qty > 0 ? it.line_total / it.qty : 0;
                    return sum + unit * (refundQty[it.id] ?? 0);
                  }, 0)
                )}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                onClick={submitRefund}
                disabled={refundBusy}
                className="rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {refundBusy ? t("transaksi.refund.processing") : t("transaksi.refund.process")}
              </button>
              <button
                onClick={() => setRefundSale(null)}
                className="rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("transaksi.refund.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between text-slate-600 dark:text-slate-400">
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );
}
