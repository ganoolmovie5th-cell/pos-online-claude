-- ============================================================
-- Migrasi v4: Batch A (pengeluaran, bundling, split payment).
-- Jalankan di Supabase SQL Editor setelah migration-v3.sql.
-- Idempoten.
-- ============================================================

-- ---------- Kolom baru ----------

-- Split payment: rincian bayar per metode (jsonb array {method, amount})
alter table sales add column if not exists payments jsonb;

-- ---------- Tabel: pengeluaran / biaya operasional ----------

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category text not null default 'Lainnya',
  amount numeric(14,2) not null default 0,
  note text,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- Tabel: bundling / paket ----------

create table if not exists bundles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  price numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists bundle_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  bundle_id uuid not null references bundles(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  qty integer not null default 1
);

create index if not exists idx_expenses_business on expenses(business_id, spent_at);
create index if not exists idx_bundles_business on bundles(business_id);
create index if not exists idx_bundle_items_bundle on bundle_items(bundle_id);

-- ---------- RLS ----------

alter table expenses     enable row level security;
alter table bundles      enable row level security;
alter table bundle_items enable row level security;

drop policy if exists expenses_rw on expenses;
create policy expenses_rw on expenses
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists bundles_rw on bundles;
create policy bundles_rw on bundles
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists bundle_items_rw on bundle_items;
create policy bundle_items_rw on bundle_items
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());
