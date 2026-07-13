CREATE OR REPLACE FUNCTION public.audit_m2_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'audit'
AS $function$
declare
  v_company uuid;
  v_entity text;
  v_before jsonb;
  v_after jsonb;
  v_id_text text;
  v_entity_id uuid;
begin
  v_entity := tg_table_name;
  if tg_op = 'INSERT' then
    v_after := to_jsonb(new); v_before := null;
  elsif tg_op = 'UPDATE' then
    v_after := to_jsonb(new); v_before := to_jsonb(old);
  else
    v_before := to_jsonb(old); v_after := null;
  end if;

  v_company := nullif(coalesce(v_after, v_before)->>'company_id','')::uuid;

  v_id_text := coalesce(v_after, v_before)->>'id';
  begin
    v_entity_id := nullif(v_id_text,'')::uuid;
  exception when others then
    v_entity_id := null;
  end;

  insert into audit.audit_logs (company_id, actor_user_id, action, entity_type, entity_id, before, after)
  values (v_company, auth.uid(), lower(tg_op), v_entity, v_entity_id, v_before, v_after);

  return coalesce(new, old);
end;
$function$;