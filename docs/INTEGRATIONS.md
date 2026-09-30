# Integrasi Eksternal

Tiga fitur butuh layanan/hardware pihak ketiga. Kode kerangka sudah ada; ikuti langkah di bawah untuk mengaktifkan.

## 1. Email laporan harian (Resend)

Kerangka: `supabase/functions/daily-report/index.ts`. Mengirim ringkasan omzet hari ini ke email pemilik tiap bisnis.

1. Daftar di [resend.com](https://resend.com), ambil API key.
2. Verifikasi domain pengirim (atau pakai `onboarding@resend.dev` untuk uji coba).
3. Set secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set REPORT_FROM="POS Online <no-reply@domainmu.com>"
   ```
4. Deploy: `supabase functions deploy daily-report`
5. Jadwalkan harian via pg_cron (SQL Editor):
   ```sql
   select cron.schedule(
     'daily-report', '0 22 * * *',
     $$ select net.http_post(
          url := 'https://<PROJECT>.functions.supabase.co/daily-report',
          headers := '{"Authorization":"Bearer <ANON_KEY>"}'::jsonb
        ) $$
   );
   ```

Email owner diambil dari `auth.users` lewat admin API (butuh service role — sudah otomatis di edge runtime).

## 2. QRIS dinamis (Midtrans)

Kerangka: `src/app/api/qris/route.ts`. Membuat transaksi QRIS dan mengembalikan URL gambar QR untuk ditampilkan di kasir.

1. Daftar [Midtrans](https://midtrans.com), ambil **Server Key** (Sandbox dulu).
2. Tambahkan ke `.env.local` (server-side, TANPA `NEXT_PUBLIC_`):
   ```
   MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
   MIDTRANS_IS_PRODUCTION=false
   ```
3. Panggil dari kasir:
   ```ts
   const res = await fetch("/api/qris", {
     method: "POST",
     body: JSON.stringify({ amount: total, orderId: `pos-${saleId}` }),
   });
   const { qrUrl } = await res.json(); // tampilkan <img src={qrUrl} />
   ```
4. Untuk konfirmasi bayar otomatis, set webhook Midtrans ke route notification (belum dibuat — tambahkan `src/app/api/qris/notify/route.ts` sesuai kebutuhan).

Provider lain (Xendit, DOKU) polanya sama: POST ke endpoint charge dengan secret di header.

## 3. Printer thermal (WebUSB / ESC-POS)

Kerangka: `src/lib/thermal.ts`, tombol **Thermal** di modal struk (menu Transaksi).

Syarat:
- Printer thermal USB yang mendukung ESC/POS.
- Browser Chromium (Chrome/Edge). Firefox/Safari tidak mendukung WebUSB.
- Situs harus HTTPS (produksi) atau `localhost`.

Pakai:
1. Colok printer via USB.
2. Buka struk di menu Transaksi, klik **Thermal**.
3. Pilih printer di dialog browser (butuh gesture klik — sudah dipenuhi).

Kalau printer tampil sebagai vendor-specific (bukan class 7), sesuaikan filter/endpoint di `connectThermal()`. Cek `chrome://device-log` untuk detail interface/endpoint.
