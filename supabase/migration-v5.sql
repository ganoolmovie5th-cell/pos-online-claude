-- ============================================================
-- Migrasi v5: Batch B (varian, stok per outlet, meja F&B).
-- Jalankan di Supabase SQL Editor setelah migration-v4.sql.
-- Idempoten.
-- ============================================================

-- ---------- Varian produk ----------
-- Varian opsional: kalau produk punya varian, harga/stok bisa beda per varian.

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  name text not null,                    -- mis "M / Merah"
  price numeric(14,2) not null default 0,
  stock integer,                         -- null = ikut/ tidak dilacak
  created_at timestamptz not null default now()
);

alter table sale_items add column if not exists variant_id uuid;
alter table sale_items add column if not exists variant_name text;

-- ---------- Stok per outlet ----------
-- Kalau dipakai, stok dilacak per outlet. products.stock tetap ada sebagai fallback
-- untuk bisnis tanpa outlet.

create table if not exists outlet_stock (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  outlet_id uuid not null references outlets(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  stock integer not null default 0,
  unique (outlet_id, product_id)
);

-- ---------- Meja F&B ----------

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,                    -- mis "Meja 1"
  created_at timestamptz not null default now()
);

-- Sesi meja: pesanan berjalan sebelum dibayar
create table if not exists table_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  status text not null default 'open',   -- open | closed
  items jsonb not null default '[]',     -- [{product_id, variant_id, name, price, qty}]
  sale_id uuid references sales(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table sales add column if not exists table_id uuid;

create index if not exists idx_variants_product on product_variants(product_id);
create index if not exists idx_outlet_stock_outlet on outlet_stock(outlet_id);
create index if not exists idx_tables_business on tables(business_id);
create index if not exists idx_table_sessions_business on table_sessions(business_id, status);

-- ---------- Fungsi: kurangi stok per outlet ----------

create or replace function decrement_outlet_stock(p_outlet uuid, items jsonb)
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
    insert into outlet_stock (business_id, outlet_id, product_id, stock)
      values (current_business_id(), p_outlet, (it->>'product_id')::uuid, 0)
    on conflict (outlet_id, product_id) do nothing;

    update outlet_stock
      set stock = greatest(stock - (it->>'qty')::int, 0)
    where outlet_id = p_outlet
      and product_id = (it->>'product_id')::uuid
      and business_id = current_business_id();
  end loop;
end;
$$;

-- ---------- RLS ----------

alter table product_variants enable row level security;
alter table outlet_stock     enable row level security;
alter table tables           enable row level security;
alter table table_sessions   enable row level security;

drop policy if exists variants_rw on product_variants;
create policy variants_rw on product_variants
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists outlet_stock_rw on outlet_stock;
create policy outlet_stock_rw on outlet_stock
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists tables_rw on tables;
create policy tables_rw on tables
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists table_sessions_rw on table_sessions;
create policy table_sessions_rw on table_sessions
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());
