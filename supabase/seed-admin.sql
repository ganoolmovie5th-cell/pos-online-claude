-- ============================================================
-- Seed akun admin platform siap pakai.
-- Jalankan di Supabase SQL Editor SETELAH schema.sql
-- (dan admin-migration.sql kalau DB lama).
--
-- Login default:
--   Email    : admin@posonline.app
--   Password : admin12345
--
-- WAJIB ganti password setelah login pertama:
--   Dashboard Supabase > Authentication > Users > (pilih user) > ...
--   atau lewat fitur reset password.
-- ============================================================

-- pgcrypto untuk hash password (biasanya sudah aktif di Supabase)
create extension if not exists pgcrypto;

-- Pastikan kolom admin ada (aman kalau schema.sql lama yang dijalankan)
alter table businesses add column if not exists is_suspended boolean not null default false;
alter table profiles   add column if not exists is_platform_admin boolean not null default false;

do $$
declare
  admin_email text := 'admin@posonline.app';
  admin_pass  text := 'admin12345';
  uid uuid;
begin
  -- Kalau sudah ada, jangan bikin ulang
  select id into uid from auth.users where email = admin_email;

  if uid is null then
    uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      uid, 'authenticated', 'authenticated', admin_email,
      crypt(admin_pass, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"business_name":"Admin Platform","full_name":"Super Admin"}',
      now(), now()
    );

    -- identity untuk provider email (dibutuhkan login password)
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid, uid,
      format('{"sub":"%s","email":"%s"}', uid, admin_email)::jsonb,
      'email', now(), now(), now()
    );
    -- trigger handle_new_user otomatis membuat business + profile
  end if;

  -- Jadikan (atau pastikan) profil ini admin platform
  update profiles set is_platform_admin = true where id = uid;
end $$;
