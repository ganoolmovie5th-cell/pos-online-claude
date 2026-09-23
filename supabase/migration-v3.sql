-- ============================================================
-- Migrasi v3: 13 fitur lanjutan.
-- Jalankan di Supabase SQL Editor setelah migration-v2.sql.
-- Idempoten.
-- ============================================================

-- ---------- Kolom baru ----------

alter table customers add column if not exists points integer not null default 0;

alter table businesses add column if not exists points_per_amount numeric(14,2) not null default 1000; -- Rp per 1 poin
alter table businesses add column if not exists point_value numeric(14,2) not null default 100;        -- 1 poin = Rp
alter table businesses add column if not exists service_charge_percent numeric(5,2) not null default 0;

alter table products add column if not exists cost_price numeric(14,2) not null default 0;

alter table sales add column if not exists points_earned integer not null default 0;
alter table sales add column if not exists points_redeemed integer not null default 0;
alter table sales add column if not exists service_charge numeric(14,2) not null default 0;
alter table sales add column if not exists voucher_code text;
alter table sales add column if not exists outlet_id uuid;

-- ---------- Tabel baru ----------

create table if not exists outlets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists stock_ins (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  qty integer not null default 0,
  cost_price numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists vouchers (
  code text primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null default 'amount',  -- amount | percent
  value numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_outlets_business on outlets(business_id);
create index if not exists idx_suppliers_business on suppliers(business_id);
create index if not exists idx_stock_ins_business on stock_ins(business_id);
create index if not exists idx_vouchers_business on vouchers(business_id);

do $$ begin
  alter table sales add constraint sales_outlet_fk foreign key (outlet_id) references outlets(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------- Fungsi: tambah/kurangi poin pelanggan ----------

create or replace function adjust_points(p_customer uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update customers
    set points = greatest(points + p_delta, 0)
  where id = p_customer
    and business_id = current_business_id();
end;
$$;

-- Restock: tambah stok produk + catat harga modal terbaru
create or replace function apply_stock_in(p_product uuid, p_qty integer, p_cost numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update products
    set stock = coalesce(stock, 0) + p_qty,
        cost_price = case when p_cost > 0 then p_cost else cost_price end
  where id = p_product
    and business_id = current_business_id();
end;
$$;

-- ---------- RLS tabel baru ----------

alter table outlets   enable row level security;
alter table suppliers enable row level security;
alter table stock_ins enable row level security;
alter table vouchers  enable row level security;

drop policy if exists outlets_rw on outlets;
create policy outlets_rw on outlets
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists suppliers_rw on suppliers;
create policy suppliers_rw on suppliers
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists stock_ins_rw on stock_ins;
create policy stock_ins_rw on stock_ins
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists vouchers_rw on vouchers;
create policy vouchers_rw on vouchers
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());
