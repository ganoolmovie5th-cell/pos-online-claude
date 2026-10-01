import { requireAdmin } from "@/lib/auth";
import type { Business, Sale } from "@/lib/types";
import AdminContent from "./AdminContent";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();

  const [{ data: bizRows }, { data: saleRows }] = await Promise.all([
    supabase.from("businesses").select("*").order("created_at", { ascending: false }),
    supabase.from("sales").select("business_id, total"),
  ]);

  const businesses = (bizRows as Business[]) ?? [];
  const sales = (saleRows as Pick<Sale, "business_id" | "total">[]) ?? [];

  // Agregat omzet + jumlah transaksi per bisnis
  const stats = new Map<string, { count: number; omzet: number }>();
  sales.forEach((s) => {
    const cur = stats.get(s.business_id) ?? { count: 0, omzet: 0 };
    cur.count += 1;
    cur.omzet += Number(s.total);
    stats.set(s.business_id, cur);
  });

  const totalOmzet = sales.reduce((s, r) => s + Number(r.total), 0);
  const aktif = businesses.filter((b) => !b.is_suspended).length;

  const rows = businesses.map((b) => {
    const st = stats.get(b.id) ?? { count: 0, omzet: 0 };
    return {
      id: b.id,
      name: b.name,
      created_at: b.created_at,
      is_suspended: b.is_suspended,
      count: st.count,
      omzet: st.omzet,
    };
  });

  return (
    <AdminContent
      rows={rows}
      totalCount={businesses.length}
      activeCount={aktif}
      totalOmzet={totalOmzet}
    />
  );
}
