-- ============================================================
-- Migrasi v8: perbaikan KRITIS dari uji E2E.
-- Insert dari app tak mengirim business_id -> RLS menolak semua
-- (403 "new row violates row-level security policy").
-- Solusi: default business_id ke current_business_id() di semua
-- tabel tenant, jadi insert app otomatis benar tanpa ubah frontend.
-- Jalankan setelah migration-v7.sql. Idempoten.
-- ============================================================

alter table categories       alter column business_id set default current_business_id();
alter table products         alter column business_id set default current_business_id();
alter table sales            alter column business_id set default current_business_id();
alter table sale_items       alter column business_id set default current_business_id();
alter table shifts           alter column business_id set default current_business_id();
alter table customers        alter column business_id set default current_business_id();
alter table debts            alter column business_id set default current_business_id();
alter table debt_payments    alter column business_id set default current_business_id();
alter table invites          alter column business_id set default current_business_id();
alter table outlets          alter column business_id set default current_business_id();
alter table suppliers        alter column business_id set default current_business_id();
alter table stock_ins        alter column business_id set default current_business_id();
alter table vouchers         alter column business_id set default current_business_id();
alter table expenses         alter column business_id set default current_business_id();
alter table bundles          alter column business_id set default current_business_id();
alter table bundle_items     alter column business_id set default current_business_id();
alter table product_variants alter column business_id set default current_business_id();
alter table outlet_stock     alter column business_id set default current_business_id();
alter table tables           alter column business_id set default current_business_id();
alter table table_sessions   alter column business_id set default current_business_id();
