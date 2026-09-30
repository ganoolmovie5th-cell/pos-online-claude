-- ============================================================
-- Migrasi v11: pembulatan tunai + audit log.
-- Jalankan di Supabase SQL Editor setelah migration-v10.sql. Idempoten.
-- ============================================================

-- ---- Pembulatan tunai ----
-- 0 = tanpa pembulatan. Nilai lain (mis. 100, 500) = bulatkan total tunai
-- ke kelipatan terdekat. Diterapkan di sisi kasir.
alter table businesses
  add column if not exists cash_rounding integer not null default 0;

-- ---- Audit log ----
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,          -- mis. void_sale, refund, delete_product
  entity text,                   -- nama tabel/objek terkait
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_business on audit_logs(business_id, created_at desc);

alter table audit_logs enable row level security;

-- Owner/admin lihat log bisnisnya. Insert lewat RPC (security definer) saja,
-- tapi izinkan insert langsung oleh anggota bisnis untuk pencatatan dari app.
drop policy if exists audit_rw on audit_logs;
create policy audit_rw on audit_logs
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

alter table audit_logs alter column business_id set default current_business_id();

-- Helper pencatatan dari app: supabase.rpc('log_action', {...})
create or replace function log_action(
  p_action text,
  p_entity text default null,
  p_entity_id text default null,
  p_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (business_id, actor_id, action, entity, entity_id, detail)
    values (current_business_id(), auth.uid(), p_action, p_entity, p_entity_id, p_detail);
end;
$$;

-- Catat otomatis saat void & refund (dipanggil dari RPC terkait).
create or replace function void_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  si record;
begin
  select * into s from sales
    where id = p_sale_id and business_id = current_business_id();
  if s.id is null then
    raise exception 'Sale tidak ditemukan';
  end if;
  if s.status = 'voided' then
    return;
  end if;

  for si in select * from sale_items where sale_id = p_sale_id
  loop
    if si.variant_id is not null then
      update product_variants set stock = stock + si.qty
        where id = si.variant_id and business_id = current_business_id() and stock is not null;
    elsif si.product_id is not null then
      if s.outlet_id is not null then
        update outlet_stock set stock = stock + si.qty
          where outlet_id = s.outlet_id and product_id = si.product_id
            and business_id = current_business_id();
      else
        update products set stock = stock + si.qty
          where id = si.product_id and business_id = current_business_id() and stock is not null;
      end if;
    end if;
  end loop;

  if s.customer_id is not null then
    update customers
      set points = greatest(points - coalesce(s.points_earned,0) + coalesce(s.points_redeemed,0), 0)
    where id = s.customer_id and business_id = current_business_id();
  end if;

  update debts set status = 'void'
    where sale_id = p_sale_id and business_id = current_business_id();

  update sales set status = 'voided', voided_at = now()
    where id = p_sale_id and business_id = current_business_id();

  insert into audit_logs (business_id, actor_id, action, entity, entity_id, detail)
    values (current_business_id(), auth.uid(), 'void_sale', 'sales', p_sale_id::text,
            jsonb_build_object('total', s.total));
end;
$$;
