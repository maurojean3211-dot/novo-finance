-- VALIDAÇÃO PÓS-HARDENING SOMENTE LEITURA. Todos os campos *_ok devem retornar true.
select policyname,cmd,roles,permissive,qual,with_check from pg_policies
where schemaname='public' and tablename='contas_pagar_pessoais' order by policyname;

with roles(rolename) as (values ('authenticated'::text),('anon'),('service_role'),('postgres'),('PUBLIC')),
 privileges(privilege) as (values ('SELECT'::text),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN'))
select rolename,privilege,case when rolename='PUBLIC' then exists(
 select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
 where c.oid='public.contas_pagar_pessoais'::regclass and a.grantee=0 and upper(a.privilege_type)=privilege)
 else has_table_privilege(rolename,'public.contas_pagar_pessoais',privilege) end efetivo
from roles cross join privileges order by rolename,privilege;

select
 (select count(*) from public.contas_pagar_pessoais)=43 contas_43_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pago')=21 pagas_21_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pendente')=22 pendentes_22_ok,
 (select coalesce(sum(valor),0) from public.contas_pagar_pessoais)=41574.73 total_ok,
 (select md5(string_agg(to_jsonb(p)::text,'|' order by id)) from public.contas_pagar_pessoais p)
  ='66e1af3fb3bd3acdd7482f0b8f1335f8' fingerprint_dados_ok,
 (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais'::regclass) rls_ok,
 (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais') x)
  ='1a4a637e8a62c5d9c6de391deffdb43d' policies_inalteradas_ok,
 (select array_agg(policyname order by policyname) from pg_policies
  where schemaname='public' and tablename='contas_pagar_pessoais')=array[
   'contas_pagar_pessoais_delete_proprietario','contas_pagar_pessoais_insert_proprietario',
   'contas_pagar_pessoais_select_proprietario','contas_pagar_pessoais_update_proprietario']::name[] policies_exatas_ok,
 not exists(select 1 from pg_policies where schemaname='public' and tablename='contas_pagar_pessoais'
  and (roles<>array['authenticated']::name[] or coalesce(btrim(qual),'') in ('true','(true)')
   or coalesce(btrim(with_check),'') in ('true','(true)'))) sem_policy_ampla_ok,
 (select bool_and(has_table_privilege('authenticated','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p) authenticated_crud_ok,
 not exists(select 1 from unnest(array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
  where has_table_privilege('authenticated','public.contas_pagar_pessoais',p)) authenticated_sem_excessos_ok,
 not exists(select 1 from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
  where has_table_privilege('anon','public.contas_pagar_pessoais',p)) anon_sem_privilegios_ok,
 not exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where c.oid='public.contas_pagar_pessoais'::regclass and a.grantee=0) public_sem_privilegios_ok,
 (select bool_and(has_table_privilege('service_role','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p) service_role_inalterado_ok,
 (select bool_and(has_table_privilege('postgres','public.contas_pagar_pessoais',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p) postgres_inalterado_ok,
 (select md5(coalesce(string_agg(concat(conname,':',contype,':',pg_get_constraintdef(oid)),'|' order by conname),''))
  from pg_constraint where conrelid='public.contas_pagar_pessoais'::regclass)
  ='feb963cf66a3fdf8c703cf0b3c188679' constraints_inalteradas_ok,
 (select md5(coalesce(string_agg(concat(indexname,':',indexdef),'|' order by indexname),''))
  from pg_indexes where schemaname='public' and tablename='contas_pagar_pessoais')
  ='4849d3d3ae3570eb137eb85dc1d5fe58' indices_inalterados_ok,
 (select md5(coalesce(string_agg(concat(p.oid::regprocedure::text,':',p.prosecdef,':',
   coalesce(array_to_string(p.proconfig,','),''),':',coalesce(p.proacl::text,'')),'|' order by p.oid::regprocedure::text),''))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
   'criar_parcelamento_conta_pessoal','criar_parcelamento_conta_pessoal_com_entrada',
   'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal',
   'atualizar_metadados_grupo_conta_pessoal','registrar_entrada_retroativa_grupo_conta_pessoal',
   'materializar_despesa_evento_entrada_pessoal'))
  ='c63955ec4c28032ec34283369cce06f5' rpcs_inalteradas_ok;
