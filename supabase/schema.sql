-- ============================================================
-- POS Online — schema multi-tenant
-- Jalankan di Supabase SQL Editor (satu kali).
-- Isolasi data per bisnis via business_id + RLS.
-- ============================================================

-- ---------- Tables ----------

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Bisnis Saya',
  currency text not null default 'IDR',
  tax_percent numeric(5,2) not null default 0,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

-- profiles: 1 user = 1 profile, terikat ke satu business
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  full_name text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  price numeric(14,2) not null default 0,
  stock integer,                       -- null = tidak dilacak
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  cashier_id uuid references profiles(id) on delete set null,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  change numeric(14,2) not null default 0,
  payment_method text not null default 'cash',
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,                  -- snapshot nama saat transaksi
  price numeric(14,2) not null,        -- snapshot harga
  qty integer not null default 1,
  line_total numeric(14,2) not null
);

create index if not exists idx_products_business on products(business_id);
create index if not exists idx_categories_business on categories(business_id);
create index if not exists idx_sales_business on sales(business_id);
create index if not exists idx_sales_created on sales(business_id, created_at);
create index if not exists idx_sale_items_sale on sale_items(sale_id);

-- ---------- Helper: business_id user saat ini ----------

create or replace function current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from profiles where id = auth.uid();
$$;

-- true kalau user saat ini super-admin platform
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

-- ---------- Auto-provision saat signup ----------
-- Tiap user baru dapat business sendiri + profile.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_biz uuid;
begin
  insert into businesses (name)
    values (coalesce(new.raw_user_meta_data->>'business_name', 'Bisnis Saya'))
    returning id into new_biz;

  insert into profiles (id, business_id, full_name)
    values (new.id, new_biz, new.raw_user_meta_data->>'full_name');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- RLS ----------

alter table businesses  enable row level security;
alter table profiles    enable row level security;
alter table categories  enable row level security;
alter table products    enable row level security;
alter table sales       enable row level security;
alter table sale_items  enable row level security;

-- businesses: bisnis milik user, atau semua kalau platform admin
drop policy if exists biz_rw on businesses;
create policy biz_rw on businesses
  for all using (id = current_business_id() or is_platform_admin())
  with check (id = current_business_id() or is_platform_admin());

-- profiles: profil sendiri, atau semua kalau platform admin (untuk statistik)
drop policy if exists profile_self on profiles;
create policy profile_self on profiles
  for all using (id = auth.uid() or is_platform_admin())
  with check (id = auth.uid());

-- generic: tabel dengan business_id (admin lihat semua)
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
