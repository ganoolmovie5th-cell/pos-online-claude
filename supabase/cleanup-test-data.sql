-- ============================================================
-- Bersihkan data uji QA. Jalankan di Supabase SQL Editor.
-- TIDAK menghapus akun (auth.users), bisnis, atau profil.
-- Pilih SALAH SATU opsi di bawah.
-- ============================================================

-- ------------------------------------------------------------
-- OPSI A — Reset SEMUA data operasional (bersih total).
-- Simpan: businesses, profiles, akun. Hapus: semua transaksi,
-- produk, pelanggan, dll. Cocok kalau mau mulai dari nol.
-- Urutan mengikuti dependency FK (anak dulu, induk belakangan).
-- ------------------------------------------------------------

-- truncate ... cascade menuntaskan dependensi otomatis.
truncate table
  sale_items,
  debt_payments,
  debts,
  table_sessions,
  stock_ins,
  outlet_stock,
  bundle_items,
  sales,
  shifts,
  bundles,
  vouchers,
  suppliers,
  product_variants,
  products,
  categories,
  customers,
  tables,
  outlets,
  invites,
  expenses
cascade;

-- Reset poin pelanggan tak perlu (customers ikut ke-truncate).
-- Reset flag suspend bisnis (kalau sempat ke-suspend saat uji):
-- update businesses set is_suspended = false;


-- ------------------------------------------------------------
-- OPSI B — Hapus HANYA baris uji QA (targeted, lebih aman).
-- Data asli non-test tetap utuh. Jalankan blok ini SEBAGAI GANTI
-- Opsi A kalau kamu sudah punya data produksi nyata.
-- ------------------------------------------------------------

-- Hapus sale_items milik sales test, lalu sales-nya:
-- delete from sale_items where sale_id in (
--   select id from sales where cashier_id in (
--     select id from profiles where full_name = 'Super Admin'
--   )
-- );
-- (Sesuaikan filter dengan penanda datamu.)

-- Produk/pelanggan/dll bertanda "QA":
-- delete from product_variants where name ilike 'QA%';
-- delete from products   where name ilike 'QA%';
-- delete from bundles    where name ilike 'QA%';
-- delete from customers  where name ilike 'QA%';
-- delete from suppliers  where name ilike 'QA%';
-- delete from outlets    where name ilike 'QA%';
-- delete from tables     where name ilike 'Meja%' or name ilike 'QA%';
-- delete from categories where name ilike 'QAcat%';
-- delete from vouchers   where code   ilike 'QA%';
-- delete from expenses   where note   ilike 'QA%';


-- ------------------------------------------------------------
-- Tutup shift uji yang menggantung (opsional, untuk kedua opsi):
-- update shifts set closed_at = now(), closing_cash = 0
--   where closed_at is null;
-- ------------------------------------------------------------
