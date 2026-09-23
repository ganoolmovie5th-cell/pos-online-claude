-- ============================================================
-- Migrasi v2: 12 fitur baru.
-- Jalankan di Supabase SQL Editor setelah schema.sql.
-- Idempoten (aman dijalankan ulang).
-- ============================================================

-- ---------- Kolom baru pada tabel lama ----------

alter table businesses add column if not exists address text;
alter table businesses add column if not exists phone text;
alter table businesses add column if not exists receipt_footer text;

alter table profiles add column if not exists role text not null default 'owner';  -- owner | cashier

alter table products add column if not exists barcode text;
alter table products add column if not exists low_stock_threshold integer not null default 5;

alter table sales add column if not exists status text not null default 'completed'; -- completed | voided
alter table sales add column if not exists voided_at timestamptz;
alter table sales add column if not exists shift_id uuid;
alter table sales add column if not exists customer_id uuid;
alter table sales add column if not exists is_debt boolean not null default false;

-- ---------- Tabel baru ----------

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  cashier_id uuid references profiles(id) on delete set null,
  opening_cash numeric(14,2) not null default 0,
  closing_cash numeric(14,2),
  expected_cash numeric(14,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

-- Kasbon: satu baris utang per transaksi kredit
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  sale_id uuid references sales(id) on delete set null,
  amount numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  status text not null default 'open',  -- open | paid
  created_at timestamptz not null default now()
);

create table if not exists debt_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);

-- Kode undangan staf: staf signup pakai kode -> join bisnis ini (bukan bikin baru)
create table if not exists invites (
  code text primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  role text not null default 'cashier',
  created_at timestamptz not null default now()
);

create index if not exists idx_shifts_business on shifts(business_id);
create index if not exists idx_customers_business on customers(business_id);
create index if not exists idx_debts_business on debts(business_id);
create index if not exists idx_products_barcode on products(business_id, barcode);

-- FK menyusul (kolom ditambah sebelum tabel target ada di beberapa urutan)
do $$ begin
  alter table sales add constraint sales_shift_fk foreign key (shift_id) references shifts(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table sales add constraint sales_customer_fk foreign key (customer_id) references customers(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------- Kurangi stok saat penjualan (transaksional) ----------
-- Panggil setelah insert sale_items. Hanya untuk produk yang melacak stok.

create or replace function decrement_stock(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
begin
  for it in select * from jsonb_array_elements(items)
  loop
    update products
      set stock = greatest(stock - (it->>'qty')::int, 0)
    where id = (it->>'product_id')::uuid
      and business_id = current_business_id()
      and stock is not null;
  end loop;
end;
$$;

-- Kembalikan stok saat void
create or replace function restore_stock(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update products p
    set stock = p.stock + si.qty
  from sale_items si
  where si.sale_id = p_sale_id
    and si.product_id = p.id
    and p.business_id = current_business_id()
    and p.stock is not null;
end;
$$;

-- ---------- Update trigger signup: dukung invite_code ----------
-- Kalau raw_user_meta_data.invite_code cocok, staf join bisnis existing.
-- Kalau tidak, buat bisnis baru (perilaku lama).

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_biz uuid;
  inv record;
begin
  select * into inv from invites
    where code = new.raw_user_meta_data->>'invite_code';

  if inv.business_id is not null then
    insert into profiles (id, business_id, full_name, role)
      values (new.id, inv.business_id, new.raw_user_meta_data->>'full_name', inv.role);
    delete from invites where code = inv.code;  -- sekali pakai
  else
    insert into businesses (name)
      values (coalesce(new.raw_user_meta_data->>'business_name', 'Bisnis Saya'))
      returning id into new_biz;
    insert into profiles (id, business_id, full_name, role)
      values (new.id, new_biz, new.raw_user_meta_data->>'full_name', 'owner');
  end if;

  return new;
end;
$$;

-- Invites: anggota bisnis boleh baca/kelola invite bisnisnya
alter table invites enable row level security;
drop policy if exists invites_rw on invites;
create policy invites_rw on invites
  for all using (business_id = current_business_id())
  with check (business_id = current_business_id());

-- ---------- RLS untuk tabel baru ----------

alter table shifts        enable row level security;
alter table customers     enable row level security;
alter table debts         enable row level security;
alter table debt_payments enable row level security;

drop policy if exists shifts_rw on shifts;
create policy shifts_rw on shifts
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists customers_rw on customers;
create policy customers_rw on customers
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists debts_rw on debts;
create policy debts_rw on debts
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists debt_payments_rw on debt_payments;
create policy debt_payments_rw on debt_payments
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());
