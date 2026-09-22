-- ============================================================
-- Migrasi: fitur admin platform (super-admin)
-- Jalankan di Supabase SQL Editor kalau schema.sql sudah pernah
-- dijalankan sebelumnya (tanpa perlu drop tabel).
-- Untuk instal baru, cukup jalankan schema.sql yang sudah memuat ini.
-- ============================================================

-- 1. Kolom baru
alter table businesses add column if not exists is_suspended boolean not null default false;
alter table profiles   add column if not exists is_platform_admin boolean not null default false;

-- 2. Fungsi cek admin
create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- 3. Perbarui policy: admin bisa akses semua tenant
drop policy if exists biz_rw on businesses;
create policy biz_rw on businesses
  for all using (id = current_business_id() or is_platform_admin())
  with check (id = current_business_id() or is_platform_admin());

drop policy if exists profile_self on profiles;
create policy profile_self on profiles
  for all using (id = auth.uid() or is_platform_admin())
  with check (id = auth.uid());

drop policy if exists cat_rw on categories;
create policy cat_rw on categories
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists prod_rw on products;
create policy prod_rw on products
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists sales_rw on sales;
create policy sales_rw on sales
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists sale_items_rw on sale_items;
create policy sale_items_rw on sale_items
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

-- ============================================================
-- 4. Jadikan akun kamu admin platform.
--    Ganti email di bawah dengan email akun yang sudah kamu daftarkan
--    lewat halaman /signup. Jalankan setelah signup.
-- ============================================================

-- update profiles set is_platform_admin = true
-- where id = (select id from auth.users where email = 'email-kamu@contoh.com');
