# POS Online

Aplikasi kasir (point of sale) online multi-industri. Kelola produk, catat penjualan, cetak struk, dan pantau omzet dari browser. Tiap bisnis punya data terisolasi (multi-tenant).

**Stack:** Next.js 15 (App Router) · React 19 · Supabase (Auth + Postgres + RLS) · Tailwind CSS · Vercel

## Fitur

- Auth email/password, tiap akun otomatis dapat bisnis sendiri
- Isolasi data antar bisnis via Row Level Security
- Kelola produk: nama, harga, kategori, stok opsional
- Kasir: katalog, keranjang, diskon, pajak, pembayaran (tunai/QRIS/transfer/e-wallet)
- Riwayat transaksi + filter + struk (cetak, WhatsApp, salin)
- Dashboard: omzet hari ini, jumlah transaksi, produk terlaris
- Pengurangan stok otomatis + peringatan stok menipis
- Void/batal transaksi (kembalikan stok)
- Laporan penjualan + export CSV
- Barcode produk + scan di kasir
- Multi-user per bisnis dengan peran (pemilik/kasir) via kode undangan
- Shift kasir (buka/tutup kas, hitung selisih)
- Pelanggan + kasbon (utang) dengan pembayaran cicilan
- Pengaturan bisnis (nama, pajak, info struk)
- Program loyalti (poin: dapat & tukar)
- Harga modal + laporan laba kotor
- Diskon persen/nominal + diskon per item
- Voucher/kupon diskon
- Service charge terpisah dari pajak
- Stok masuk + supplier (restock)
- Laporan omzet per kategori
- Tahan (park) transaksi
- Multi-outlet (pengelompokan dalam satu bisnis)
- Antrean transaksi offline (kirim otomatis saat online)
- PWA installable
- Pengeluaran operasional + laporan laba-rugi (laba bersih)
- Bayar campuran / split payment (tunai + non-tunai)
- Grafik omzet per hari
- Stok opname (penyesuaian stok fisik)
- Produk bundling / paket
- Scan barcode pakai kamera
- Cetak label harga + barcode
- Varian produk (ukuran/warna, harga/stok beda)
- Stok per outlet (multi-cabang)
- Mode meja F&B (buka sesi meja, bayar per meja)
- Cache katalog offline (kasir tetap jalan saat internet putus)
- Kerangka Edge Function laporan harian otomatis (`supabase/functions/daily-report`)

## Setup

### 1. Supabase

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan berurutan:
   - `supabase/schema.sql` — tabel inti + RLS + trigger
   - `supabase/migration-v2.sql` — stok, void, shift, pelanggan, kasbon, multi-user
   - `supabase/migration-v3.sql` — loyalty, laba, voucher, outlet, service charge, restock
   - `supabase/migration-v4.sql` — pengeluaran, bundling, split payment
   - `supabase/migration-v5.sql` — varian, stok per outlet, meja F&B
   - `supabase/migration-v6.sql` — perbaikan: cost snapshot + stok varian
   - `supabase/migration-v7.sql` — perbaikan: void transaksi lengkap (stok/poin/kasbon)
   - `supabase/migration-v8.sql` — **kritis**: default `business_id` (tanpa ini semua insert ditolak RLS)
   - `supabase/migration-v9.sql` — perbaikan: konsistensi stok outlet
3. (Opsional, disarankan) Jalankan `supabase/seed-admin.sql` untuk membuat akun admin platform siap pakai:
   - Email: `admin@posonline.app`
   - Password: `admin12345` — **ganti setelah login pertama**
4. (Opsional) Di **Authentication > Providers > Email**, matikan "Confirm email" agar signup langsung bisa login saat pengembangan.
5. Ambil `Project URL` dan `anon key` dari **Project Settings > API**.

### 2. Environment

Salin `.env.example` jadi `.env.local`, lalu isi:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Jalankan

```bash
npm install
npm run dev
# buka http://localhost:3000
```

## Deploy ke Vercel

1. Import repo ini di Vercel.
2. Set environment variable `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy. Push ke `main` memicu deploy otomatis.

## Struktur

```
src/
  app/
    page.tsx              → landing
    login, signup/        → auth (signup dukung kode undangan staf)
    suspended/            → halaman bisnis ditangguhkan
    admin/                → panel super-admin (lihat/suspend/hapus bisnis)
    dashboard/
      layout.tsx          → shell + sidebar (proteksi login + role)
      page.tsx            → ringkasan + peringatan stok kritis
      kasir/              → transaksi (diskon, voucher, poin, split, bundle, varian)
      produk/ varian/     → CRUD produk + varian
      bundle/ restock/    → paket + stok masuk (supplier)
      opname/ stok-outlet/→ penyesuaian stok + stok per outlet
      transaksi/          → riwayat + filter + struk + void
      pelanggan/ voucher/ → pelanggan+kasbon + kupon
      shift/ biaya/       → shift kas + pengeluaran
      meja/ laporan/      → mode F&B + laporan laba-rugi + CSV
      anggota/ pengaturan/→ multi-user + setelan bisnis
  components/             → Sidebar, BarcodeScanner, RegisterSW
  lib/
    supabase/             → client, server, middleware
    auth.ts               → requireBusiness(), requireAdmin()
    format.ts, types.ts, receipt.ts, offline.ts
supabase/
  schema.sql              → tabel inti + RLS + trigger
  migration-v2..v9.sql    → fitur lanjutan + perbaikan (jalankan berurutan)
  seed-admin.sql          → akun admin siap pakai
  functions/daily-report  → kerangka Edge Function laporan harian
e2e/                      → uji Playwright (alur inti terverifikasi di produksi)
```

## Catatan

- Multi-tenant di level baris (RLS berbasis `business_id`), diisi otomatis lewat default `current_business_id()`.
- Multi-outlet berupa pengelompokan dalam satu bisnis (bukan isolasi RLS terpisah).
- Offline: antre transaksi + cache katalog, bukan offline-first penuh (tanpa sinkronisasi dua arah).
- Belum termasuk: payment gateway asli, printer thermal, notifikasi email otomatis (baru kerangka).
- Signup butuh verifikasi email bila "Confirm email" aktif di Supabase.
