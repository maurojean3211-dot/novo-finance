-- HARDENING CONTROLADO FUTURO. NÃO EXECUTAR SEM NOVA AUTORIZAÇÃO.
begin;
do $guards$
begin
 if (select count(*) from public.contas_pagar_pessoais)<>43
 or (select count(*) from public.contas_pagar_pessoais where status='Pago')<>21
 or (select count(*) from public.contas_pagar_pessoais where status='Pendente')<>22
 or (select coalesce(sum(valor),0) from public.contas_pagar_pessoais)<>41574.73
 or (select md5(string_agg(to_jsonb(p)::text,'|' order by id)) from public.contas_pagar_pessoais p)
    <>'66e1af3fb3bd3acdd7482f0b8f1335f8'
 then raise exception 'ABORTADO: dados financeiros divergiram'; end if;
 if not (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais'::regclass)
 or (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais') x)<>'1a4a637e8a62c5d9c6de391deffdb43d'
 then raise exception 'ABORTADO: RLS/policies divergiram'; end if;
 if not (select bool_and(has_table_privilege('authenticated','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p)
 then raise exception 'ABORTADO: ACL de authenticated não contém CRUD + quatro excessos esperados'; end if;
 if exists(select 1 from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
  where has_table_privilege('anon','public.contas_pagar_pessoais',p))
 or exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where c.oid='public.contas_pagar_pessoais'::regclass and a.grantee=0)
 then raise exception 'ABORTADO: anon/PUBLIC possui privilégio inesperado'; end if;
 if not (select bool_and(has_table_privilege('service_role','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p)
 or not (select bool_and(has_table_privilege('postgres','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p)
 then raise exception 'ABORTADO: service_role/postgres divergiram'; end if;
 if (select md5(coalesce(string_agg(concat(conname,':',contype,':',pg_get_constraintdef(oid)),'|' order by conname),''))
  from pg_constraint where conrelid='public.contas_pagar_pessoais'::regclass)<>'feb963cf66a3fdf8c703cf0b3c188679'
 or (select md5(coalesce(string_agg(concat(indexname,':',indexdef),'|' order by indexname),''))
  from pg_indexes where schemaname='public' and tablename='contas_pagar_pessoais')<>'4849d3d3ae3570eb137eb85dc1d5fe58'
 or (select md5(coalesce(string_agg(concat(p.oid::regprocedure::text,':',p.prosecdef,':',
   coalesce(array_to_string(p.proconfig,','),''),':',coalesce(p.proacl::text,'')),'|' order by p.oid::regprocedure::text),''))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
   'criar_parcelamento_conta_pessoal','criar_parcelamento_conta_pessoal_com_entrada',
   'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal',
   'atualizar_metadados_grupo_conta_pessoal','registrar_entrada_retroativa_grupo_conta_pessoal',
   'materializar_despesa_evento_entrada_pessoal'))
   <>'c63955ec4c28032ec34283369cce06f5'
 then raise exception 'ABORTADO: constraints/índices/RPCs divergiram'; end if;
end $guards$;

revoke truncate,references,trigger,maintain on table public.contas_pagar_pessoais from authenticated;

do $postguards$
begin
 if not (select bool_and(has_table_privilege('authenticated','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p)
 or exists(select 1 from unnest(array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
  where has_table_privilege('authenticated','public.contas_pagar_pessoais',p))
 then raise exception 'ABORTADO: authenticated não ficou exclusivamente com CRUD'; end if;
 if (select md5(string_agg(to_jsonb(p)::text,'|' order by id)) from public.contas_pagar_pessoais p)
    <>'66e1af3fb3bd3acdd7482f0b8f1335f8'
 or not (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais'::regclass)
 or (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais') x)<>'1a4a637e8a62c5d9c6de391deffdb43d'
 then raise exception 'ABORTADO: dados/RLS/policies foram alterados'; end if;
 if exists(select 1 from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
  where has_table_privilege('anon','public.contas_pagar_pessoais',p))
 or exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where c.oid='public.contas_pagar_pessoais'::regclass and a.grantee=0)
 or not (select bool_and(has_table_privilege('service_role','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p)
 or not (select bool_and(has_table_privilege('postgres','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p)
 then raise exception 'ABORTADO: ACL de outros papéis divergiu'; end if;
end $postguards$;
commit;
