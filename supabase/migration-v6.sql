-- ============================================================
-- Migrasi v6: perbaikan QA (cost snapshot + stok varian).
-- Jalankan di Supabase SQL Editor setelah migration-v5.sql.
-- Idempoten.
-- ============================================================

-- Snapshot harga modal per item saat transaksi (untuk laba akurat,
-- termasuk varian & bundle yang tak terhubung ke products.cost_price).
alter table sale_items add column if not exists cost_price numeric(14,2) not null default 0;

-- Kurangi stok varian (product_variants.stock)
create or replace function decrement_variant_stock(items jsonb)
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
    update product_variants
      set stock = greatest(stock - (it->>'qty')::int, 0)
    where id = (it->>'variant_id')::uuid
      and business_id = current_business_id()
      and stock is not null;
  end loop;
end;
$$;
