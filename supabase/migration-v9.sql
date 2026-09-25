-- ============================================================
-- Migrasi v9: perbaikan BUG-11 (stok outlet konsisten).
-- Jalankan setelah migration-v8.sql. Idempoten.
--
-- Masalah: decrement_outlet_stock men-seed entri baru dengan stok 0,
-- padahal badge kasir menampilkan stok global (fallback). Akibatnya
-- transaksi pertama di outlet membuat stok outlet jadi 0, tak konsisten
-- dengan angka yang dilihat kasir.
--
-- Fix: saat entri outlet_stock belum ada, seed dari products.stock global
-- (bukan 0), lalu baru dikurangi. Konsisten dengan badge.
-- ============================================================

create or replace function decrement_outlet_stock(p_outlet uuid, items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
  pid uuid;
  gstock integer;
begin
  for it in select * from jsonb_array_elements(items)
  loop
    pid := (it->>'product_id')::uuid;
    -- stok global sebagai nilai awal kalau entri outlet belum ada
    select stock into gstock from products
      where id = pid and business_id = current_business_id();

    insert into outlet_stock (business_id, outlet_id, product_id, stock)
      values (current_business_id(), p_outlet, pid, coalesce(gstock, 0))
    on conflict (outlet_id, product_id) do nothing;

    update outlet_stock
      set stock = greatest(stock - (it->>'qty')::int, 0)
    where outlet_id = p_outlet
      and product_id = pid
      and business_id = current_business_id();
  end loop;
end;
$$;
