# POS Online

Aplikasi kasir (point of sale) online multi-industri. Kelola produk, catat penjualan, cetak struk, dan pantau omzet dari browser. Tiap bisnis punya data terisolasi (multi-tenant).

**Stack:** Next.js 15 (App Router) · React 19 · Supabase (Auth + Postgres + RLS) · Tailwind CSS · Vercel

## Fitur

- Auth email/password, tiap akun otomatis dapat bisnis sendiri
- Isolasi data antar bisnis via Row Level Security
- Kelola produk: nama, harga, kategori, stok opsional
- Kasir: katalog, keranjang, diskon, pajak, pembayaran (tunai/QRIS/transfer/e-wallet)
- Riwayat transaksi + struk siap cetak
- Dashboard: omzet hari ini, jumlah transaksi, produk terlaris

## Setup

### 1. Supabase

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan isi `supabase/schema.sql`.
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
    login, signup/        → auth
    dashboard/
      layout.tsx          → shell + sidebar (proteksi login)
      page.tsx            → ringkasan
      kasir/              → transaksi baru
      produk/             → CRUD produk
      transaksi/          → riwayat + struk
  components/Sidebar.tsx
  lib/
    supabase/             → client, server, middleware
    auth.ts               → requireBusiness()
    format.ts, types.ts
supabase/schema.sql       → tabel + RLS + trigger
```

## Catatan

Multi-tenant di level baris (RLS berbasis `business_id`). Payment gateway, hardware printer, dan multi-outlet belum termasuk — bisa ditambah menyusul.
