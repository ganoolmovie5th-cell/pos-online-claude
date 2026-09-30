-- ============================================================
-- Migrasi v10: retur/refund sebagian.
-- Jalankan di Supabase SQL Editor setelah migration-v9.sql. Idempoten.
--
-- Beda dengan void: void batalkan seluruh transaksi. Refund
-- mengembalikan sebagian item (qty terpilih), restok item itu,
-- kurangi poin proporsional, dan catat di tabel refunds.
-- Transaksi asli tetap 'completed' (parsial) atau jadi 'refunded'
-- (kalau semua item balik).
-- ============================================================

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  cashier_id uuid references profiles(id) on delete set null,
  amount numeric(14,2) not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists refund_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  refund_id uuid not null references refunds(id) on delete cascade,
  sale_item_id uuid references sale_items(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  variant_id uuid,
  name text not null,
  qty integer not null,
  amount numeric(14,2) not null
);

create index if not exists idx_refunds_business on refunds(business_id);
create index if not exists idx_refunds_sale on refunds(sale_id);
create index if not exists idx_refund_items_refund on refund_items(refund_id);

alter table refunds      enable row level security;
alter table refund_items enable row level security;

drop policy if exists refunds_rw on refunds;
create policy refunds_rw on refunds
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

drop policy if exists refund_items_rw on refund_items;
create policy refund_items_rw on refund_items
  for all using (business_id = current_business_id() or is_platform_admin())
  with check (business_id = current_business_id());

alter table refunds      alter column business_id set default current_business_id();
alter table refund_items alter column business_id set default current_business_id();

-- Kolom penanda qty yang sudah diretur per sale_item (biar tak over-refund).
alter table sale_items add column if not exists refunded_qty integer not null default 0;

-- Kolom refunded_total di sales (akumulasi nilai refund).
alter table sales add column if not exists refunded_total numeric(14,2) not null default 0;

-- ------------------------------------------------------------
-- refund_sale_items: retur sebagian.
-- items: jsonb array [{ sale_item_id, qty }]
-- Restok item (produk/varian/outlet), kurangi poin proporsional,
-- catat refund + refund_items, update refunded_qty & status.
-- Dipanggil: supabase.rpc('refund_sale_items', { p_sale_id, p_items, p_reason })
-- ------------------------------------------------------------
create or replace function refund_sale_items(p_sale_id uuid, p_items jsonb, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  it jsonb;
  si record;
  req_qty integer;
  refundable integer;
  line_unit numeric(14,2);
  refund_amount numeric(14,2);
  total_refund numeric(14,2) := 0;
  new_refund_id uuid;
  total_qty_sold integer := 0;
  total_qty_refunded integer := 0;
begin
  select * into s from sales
    where id = p_sale_id and business_id = current_business_id();
  if s.id is null then
    raise exception 'Transaksi tidak ditemukan';
  end if;
  if s.status = 'voided' then
    raise exception 'Transaksi sudah dibatalkan (void)';
  end if;

  insert into refunds (sale_id, cashier_id, reason)
    values (p_sale_id, auth.uid(), p_reason)
    returning id into new_refund_id;

  for it in select * from jsonb_array_elements(p_items)
  loop
    req_qty := (it->>'qty')::int;
    if req_qty is null or req_qty <= 0 then
      continue;
    end if;

    select * into si from sale_items
      where id = (it->>'sale_item_id')::uuid
        and sale_id = p_sale_id
        and business_id = current_business_id();
    if si.id is null then
      raise exception 'Item bukan bagian dari transaksi ini';
    end if;

    refundable := si.qty - coalesce(si.refunded_qty, 0);
    if req_qty > refundable then
      raise exception 'Qty retur (%) melebihi sisa yang bisa diretur (%) untuk %', req_qty, refundable, si.name;
    end if;

    -- harga per unit dari line_total (sudah termasuk diskon per baris)
    line_unit := case when si.qty > 0 then si.line_total / si.qty else 0 end;
    refund_amount := round(line_unit * req_qty, 2);
    total_refund := total_refund + refund_amount;

    -- Restok
    if si.variant_id is not null then
      update product_variants
        set stock = stock + req_qty
      where id = si.variant_id and business_id = current_business_id() and stock is not null;
    elsif si.product_id is not null then
      if s.outlet_id is not null then
        update outlet_stock
          set stock = stock + req_qty
        where outlet_id = s.outlet_id and product_id = si.product_id
          and business_id = current_business_id();
      else
        update products
          set stock = stock + req_qty
        where id = si.product_id and business_id = current_business_id() and stock is not null;
      end if;
    end if;

    insert into refund_items (refund_id, sale_item_id, product_id, variant_id, name, qty, amount)
      values (new_refund_id, si.id, si.product_id, si.variant_id, si.name, req_qty, refund_amount);

    update sale_items
      set refunded_qty = coalesce(refunded_qty, 0) + req_qty
    where id = si.id;
  end loop;

  if total_refund <= 0 then
    -- tidak ada yang diretur; batalkan record refund kosong
    delete from refunds where id = new_refund_id;
    raise exception 'Tidak ada item valid untuk diretur';
  end if;

  update refunds set amount = total_refund where id = new_refund_id;

  -- Poin: kurangi poin proporsional (hanya poin earned; redeem tak dibalik parsial)
  if s.customer_id is not null and coalesce(s.points_earned,0) > 0 and s.total > 0 then
    update customers
      set points = greatest(points - round(coalesce(s.points_earned,0) * (total_refund / s.total)), 0)
    where id = s.customer_id and business_id = current_business_id();
  end if;

  -- Update akumulasi refund + status transaksi
  select sum(qty), sum(coalesce(refunded_qty,0)) into total_qty_sold, total_qty_refunded
    from sale_items where sale_id = p_sale_id;

  update sales
    set refunded_total = coalesce(refunded_total,0) + total_refund,
        status = case when total_qty_refunded >= total_qty_sold then 'refunded' else status end
  where id = p_sale_id and business_id = current_business_id();

  -- Audit log (tabel dibuat di v11; abaikan jika belum ada).
  begin
    insert into audit_logs (business_id, actor_id, action, entity, entity_id, detail)
      values (current_business_id(), auth.uid(), 'refund', 'sales', p_sale_id::text,
              jsonb_build_object('amount', total_refund, 'reason', p_reason));
  exception when undefined_table then
    null;
  end;

  return new_refund_id;
end;
$$;
