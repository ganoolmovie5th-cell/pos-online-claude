// ============================================================
// Supabase Edge Function: laporan harian otomatis per bisnis.
//
// Kirim ringkasan penjualan hari ini ke email pemilik tiap bisnis.
// Pakai service role -> lewati RLS, jadi bisa baca semua bisnis.
//
// Deploy:
//   supabase functions deploy daily-report
//
// Secret (set via `supabase secrets set KEY=value`):
//   RESEND_API_KEY   -> kirim email (daftar gratis di resend.com)
//   REPORT_FROM      -> alamat pengirim terverifikasi di Resend
//                       (default: onboarding@resend.dev untuk uji coba)
//   REPORT_EMAIL     -> (opsional) email cc/fallback global
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY -> auto di-inject di edge runtime
//
// Jadwalkan harian via Supabase Dashboard > Database > Cron (pg_cron):
//   select cron.schedule(
//     'daily-report', '0 22 * * *',   -- tiap hari 22:00 WIB (set TZ server)
//     $$ select net.http_post(
//          url := 'https://<PROJECT>.functions.supabase.co/daily-report',
//          headers := '{"Authorization":"Bearer <ANON_KEY>"}'::jsonb
//        ) $$
//   );
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

type SaleRow = { business_id: string; total: number };
type Summary = { omzet: number; count: number };

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data: sales } = await supabase
    .from("sales")
    .select("business_id, total")
    .eq("status", "completed")
    .gte("created_at", start.toISOString());

  const perBiz = new Map<string, Summary>();
  ((sales as SaleRow[]) ?? []).forEach((s) => {
    const cur = perBiz.get(s.business_id) ?? { omzet: 0, count: 0 };
    cur.omzet += Number(s.total);
    cur.count += 1;
    perBiz.set(s.business_id, cur);
  });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("REPORT_FROM") ?? "POS Online <onboarding@resend.dev>";
  if (!resendKey) {
    return json({ ok: false, reason: "RESEND_API_KEY belum di-set", businesses: perBiz.size });
  }

  // Nama bisnis + email pemilik. Owner = profile pertama per bisnis (role owner).
  const bizIds = [...perBiz.keys()];
  const { data: bizRows } = await supabase
    .from("businesses")
    .select("id, name")
    .in("id", bizIds.length ? bizIds : ["00000000-0000-0000-0000-000000000000"]);
  const bizName = new Map<string, string>();
  ((bizRows as { id: string; name: string }[]) ?? []).forEach((b) => bizName.set(b.id, b.name));

  const { data: owners } = await supabase
    .from("profiles")
    .select("id, business_id, role")
    .eq("role", "owner")
    .in("business_id", bizIds.length ? bizIds : ["00000000-0000-0000-0000-000000000000"]);

  // Ambil email tiap owner dari auth.users (admin API).
  const ownerEmail = new Map<string, string>();
  for (const p of ((owners as { id: string; business_id: string }[]) ?? [])) {
    const { data: u } = await supabase.auth.admin.getUserById(p.id);
    if (u.user?.email) ownerEmail.set(p.business_id, u.user.email);
  }

  let sent = 0;
  for (const [biz, v] of perBiz.entries()) {
    const to = ownerEmail.get(biz) ?? Deno.env.get("REPORT_EMAIL");
    if (!to) continue;
    const name = bizName.get(biz) ?? "Bisnis";
    const html =
      `<h2>Laporan Harian — ${name}</h2>` +
      `<p>Omzet hari ini: <b>Rp${v.omzet.toLocaleString("id-ID")}</b></p>` +
      `<p>Jumlah transaksi: <b>${v.count}</b></p>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `Laporan Harian — ${name}`, html }),
    });
    if (res.ok) sent += 1;
  }

  return json({ ok: true, businesses: perBiz.size, sent });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}
