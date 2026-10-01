import { requireBusiness } from "@/lib/auth";
import type { Sale, SaleItem } from "@/lib/types";
import DashboardContent from "./DashboardContent";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const { supabase, business, isAdmin } = await requireBusiness();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: todaySales } = await supabase
    .from("sales")
    .select("total")
    .gte("created_at", startOfDay.toISOString());

  const sales = (todaySales as Pick<Sale, "total">[]) ?? [];
  const omzet = sales.reduce((s, r) => s + Number(r.total), 0);
  const jumlah = sales.length;

  // Produk terlaris (30 hari terakhir, agregat di app — cukup untuk MVP)
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const { data: itemRows } = await supabase
    .from("sale_items")
    .select("name, qty, sales!inner(created_at)")
    .gte("sales.created_at", last30.toISOString());

  const tally = new Map<string, number>();
  ((itemRows as (Pick<SaleItem, "name" | "qty">[])) ?? []).forEach((r) => {
    tally.set(r.name, (tally.get(r.name) ?? 0) + Number(r.qty));
  });
  const top = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Stok kritis: produk yang melacak stok & stok <= ambang
  const { data: prodRows } = await supabase
    .from("products")
    .select("id, name, stock, low_stock_threshold")
    .eq("is_active", true)
    .not("stock", "is", null);
  const lowStock = ((prodRows as { id: string; name: string; stock: number; low_stock_threshold: number }[]) ?? [])
    .filter((p) => p.stock <= p.low_stock_threshold)
    .sort((a, b) => a.stock - b.stock)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock }));

  return (
    <DashboardContent
      businessName={business.name}
      isAdmin={isAdmin}
      omzet={omzet}
      jumlah={jumlah}
      lowStock={lowStock}
      top={top}
    />
  );
}
