import { rupiah, tanggal } from "@/lib/format";
import type { Business, Sale, SaleItem } from "@/lib/types";

// Struk versi teks untuk share WhatsApp / salin.
export function receiptText(
  business: Business | null,
  sale: Sale,
  items: SaleItem[]
): string {
  const lines: string[] = [];
  lines.push(`*${business?.name ?? "Struk"}*`);
  if (business?.address) lines.push(business.address);
  if (business?.phone) lines.push(business.phone);
  lines.push(tanggal(sale.created_at));
  if (sale.status === "voided") lines.push("— DIBATALKAN —");
  lines.push("--------------------------");
  items.forEach((it) => {
    lines.push(`${it.qty}x ${it.name} — ${rupiah(it.line_total)}`);
  });
  lines.push("--------------------------");
  lines.push(`Subtotal: ${rupiah(sale.subtotal)}`);
  if (sale.discount > 0) lines.push(`Diskon: -${rupiah(sale.discount)}`);
  if (sale.tax > 0) lines.push(`Pajak: ${rupiah(sale.tax)}`);
  if (sale.service_charge > 0) lines.push(`Service: ${rupiah(sale.service_charge)}`);
  lines.push(`*Total: ${rupiah(sale.total)}*`);
  if (sale.points_earned > 0) lines.push(`Poin didapat: +${sale.points_earned}`);
  if (sale.points_redeemed > 0) lines.push(`Poin ditebus: -${sale.points_redeemed}`);
  if (sale.payment_method === "cash") {
    lines.push(`Bayar: ${rupiah(sale.paid)}`);
    lines.push(`Kembali: ${rupiah(sale.change)}`);
  }
  lines.push("");
  lines.push(business?.receipt_footer || "Terima kasih 🙏");
  return lines.join("\n");
}
