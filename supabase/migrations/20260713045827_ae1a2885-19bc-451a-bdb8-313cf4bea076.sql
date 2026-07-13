
revoke execute on function public.apply_stock_movement() from public, anon, authenticated;
revoke execute on function public.detect_low_stock() from public, anon, authenticated;
revoke execute on function public.seed_inventory_defaults() from public, anon, authenticated;
revoke execute on function public.record_purchase_atomic(uuid,uuid,uuid,date,text,text,text,jsonb) from public, anon;
