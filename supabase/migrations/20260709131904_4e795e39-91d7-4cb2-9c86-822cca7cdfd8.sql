
-- Pin search_path on trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Revoke EXECUTE on SECURITY DEFINER functions from API-facing roles.
-- Triggers still fire (they run as table owner), and internal callers use service_role.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_company() from public, anon, authenticated;
revoke execute on function public.protect_last_owner() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- private.* helpers must remain callable by authenticated (used inside RLS policies as auth.uid()),
-- but revoke from anon and public to shrink surface.
revoke execute on function private.is_company_member(uuid) from public, anon;
revoke execute on function private.has_permission(uuid, text) from public, anon;
revoke execute on function private.current_member_id(uuid) from public, anon;
grant execute on function private.is_company_member(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;
grant execute on function private.current_member_id(uuid) to authenticated;
