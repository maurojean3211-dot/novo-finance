-- ROLLBACK FUTURO. NÃO EXECUTAR SEM AUTORIZAÇÃO ESPECÍFICA.
-- Restaura exclusivamente TRUNCATE, REFERENCES, TRIGGER e MAINTAIN para authenticated.
begin;
do $guards$
begin
 if (select md5(string_agg(to_jsonb(p)::text,'|' order by id)) from public.contas_pagar_pessoais p)
    <>'66e1af3fb3bd3acdd7482f0b8f1335f8'
 or not (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais'::regclass)
 or (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais') x)<>'1a4a637e8a62c5d9c6de391deffdb43d'
 then raise exception 'ABORTADO: dados/RLS/policies divergiram'; end if;
 if not (select bool_and(has_table_privilege('authenticated','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p)
 or exists(select 1 from unnest(array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
  where has_table_privilege('authenticated','public.contas_pagar_pessoais',p))
 then raise exception 'ABORTADO: estado pós-hardening não é o esperado'; end if;
 if exists(select 1 from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
  where has_table_privilege('anon','public.contas_pagar_pessoais',p))
 or exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where c.oid='public.contas_pagar_pessoais'::regclass and a.grantee=0)
 then raise exception 'ABORTADO: anon/PUBLIC divergiu'; end if;
end $guards$;

grant truncate,references,trigger,maintain on table public.contas_pagar_pessoais to authenticated;

do $postguards$
begin
 if not (select bool_and(has_table_privilege('authenticated','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p)
 then raise exception 'ABORTADO: rollback não restaurou o baseline de oito privilégios'; end if;
end $postguards$;
commit;
