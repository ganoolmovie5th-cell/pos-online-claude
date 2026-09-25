// ============================================================
// Supabase Edge Function: laporan harian otomatis.
// KERANGKA — perlu di-deploy + diberi secret sendiri.
//
// Deploy:
//   supabase functions deploy daily-report
//
// Secret yang dibutuhkan (set via `supabase secrets set`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto di-inject di edge runtime)
//   RESEND_API_KEY   -> kirim email (daftar gratis di resend.com)
//   REPORT_EMAIL     -> email tujuan laporan
//
// Jadwalkan harian via Supabase Dashboard > Database > Cron (pg_cron):
//   select cron.schedule(
//     'daily-report', '0 22 * * *',   -- tiap hari 22:00
//     $$ select net.http_post(
//          url := 'https://<PROJECT>.functions.supabase.co/daily-report',
//          headers := '{"Authorization":"Bearer <ANON_KEY>"}'::jsonb
//        ) $$
//   );
//
// CATATAN: kerangka ini belum diuji. Sesuaikan dengan versi runtime
// Supabase Edge (Deno) saat kamu deploy.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Rentang hari ini
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  // Ambil ringkasan per bisnis (service role -> lewati RLS)
  const { data: sales } = await supabase
    .from("sales")
    .select("business_id, total")
    .eq("status", "completed")
    .gte("created_at", start.toISOString());

  const perBiz = new Map<string, { omzet: number; count: number }>();
  (sales ?? []).forEach((s: { business_id: string; total: number }) => {
    const cur = perBiz.get(s.business_id) ?? { omzet: 0, count: 0 };
    cur.omzet += Number(s.total);
    cur.count += 1;
    perBiz.set(s.business_id, cur);
  });

  // Kirim email ringkas (contoh pakai Resend). Ganti sesuai provider kamu.
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("REPORT_EMAIL");
  if (resendKey && to) {
    const lines = [...perBiz.entries()]
      .map(([biz, v]) => `${biz}: Rp${v.omzet.toLocaleString("id-ID")} (${v.count} transaksi)`)
      .join("<br>");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "POS Online <onboarding@resend.dev>",
        to,
        subject: "Laporan Penjualan Harian",
        html: `<h2>Ringkasan hari ini</h2>${lines || "Tidak ada penjualan."}`,
      }),
    });
  }

  return new Response(JSON.stringify({ ok: true, businesses: perBiz.size }), {
    headers: { "Content-Type": "application/json" },
  });
});
