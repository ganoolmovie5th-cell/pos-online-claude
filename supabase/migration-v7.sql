-- ============================================================
-- Migrasi v7: perbaikan QA ronde 2 (void transaksi lengkap).
-- Jalankan di Supabase SQL Editor setelah migration-v6.sql.
-- Idempoten.
-- ============================================================

-- Void transaksi secara menyeluruh dalam satu transaksi DB:
--   - kembalikan stok produk (global atau outlet, sesuai sale.outlet_id)
--   - kembalikan stok varian
--   - balikkan poin (batalkan earn, kembalikan redeem)
--   - tutup kasbon terkait
--   - set status voided
-- Dipanggil dari app: supabase.rpc('void_sale', { p_sale_id })

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
    return; -- sudah void, idempoten
  end if;

  -- Kembalikan stok tiap item
  for si in
    select * from sale_items where sale_id = p_sale_id
  loop
    if si.variant_id is not null then
      -- stok varian
      update product_variants
        set stock = stock + si.qty
      where id = si.variant_id and business_id = current_business_id() and stock is not null;
    elsif si.product_id is not null then
      if s.outlet_id is not null then
        update outlet_stock
          set stock = stock + si.qty
        where outlet_id = s.outlet_id and product_id = si.product_id
          and business_id = current_business_id();
      else
        update products
          set stock = stock + si.qty
        where id = si.product_id and business_id = current_business_id() and stock is not null;
      end if;
    end if;
    -- catatan: item bundle (product_id null tanpa variant) tak dilacak stoknya di sini
  end loop;

  -- Balikkan poin: batalkan earn, kembalikan redeem
  if s.customer_id is not null then
    update customers
      set points = greatest(points - coalesce(s.points_earned,0) + coalesce(s.points_redeemed,0), 0)
    where id = s.customer_id and business_id = current_business_id();
  end if;

  -- Tutup kasbon terkait (anggap batal)
  update debts
    set status = 'void'
  where sale_id = p_sale_id and business_id = current_business_id();

  -- Tandai void
  update sales
    set status = 'voided', voided_at = now()
  where id = p_sale_id and business_id = current_business_id();
end;
$$;
