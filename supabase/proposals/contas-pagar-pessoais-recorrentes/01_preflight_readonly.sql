-- PREFLIGHT ESTRITAMENTE SOMENTE LEITURA. Todos os campos *_ok devem retornar true.
-- Baseline remoto aprovado em leitura: qualquer mudança posterior deve falhar.

select column_name,data_type,is_nullable,column_default from information_schema.columns
where table_schema='public' and table_name in ('contas_pagar_pessoais','contas_fixas') order by table_name,ordinal_position;

select c.relrowsecurity rls_habilitada,c.relforcerowsecurity rls_forcada,
 r.rolname owner_role,r.rolbypassrls owner_bypassrls
from pg_class c join pg_roles r on r.oid=c.relowner
where c.oid='public.contas_pagar_pessoais'::regclass;

select policyname,cmd,roles,permissive,qual,with_check from pg_policies
where schemaname='public' and tablename='contas_pagar_pessoais' order by policyname;

with roles(rolename) as (values ('authenticated'::text),('anon'::text),('PUBLIC'::text)),
 privileges(privilege) as (values ('SELECT'::text),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'))
select rolename,privilege,
 case when rolename='PUBLIC' then exists(
  select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where a.grantee=0 and upper(a.privilege_type)=privilege)
 else has_table_privilege(rolename,'public.contas_pagar_pessoais',privilege) end as efetivo
from roles cross join privileges cross join lateral
 (select relacl,relowner from pg_class where oid='public.contas_pagar_pessoais'::regclass) c
order by rolename,privilege;

select p.oid::regprocedure funcao,p.prosecdef security_definer,p.proconfig configuracao,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_executa,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_executa,
 exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where a.grantee=0 and a.privilege_type='EXECUTE') public_executa
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'criar_parcelamento_conta_pessoal','criar_parcelamento_conta_pessoal_com_entrada',
 'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal',
 'atualizar_metadados_grupo_conta_pessoal')
order by p.oid::regprocedure::text;

select id,empresa_id,descricao,valor,dia_vencimento,frequencia,ativo,created_at from public.contas_fixas
where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid order by id;

with security_state as (
 select md5(concat_ws('|',
  (select concat(c.relrowsecurity,':',c.relforcerowsecurity) from pg_class c where c.oid='public.contas_pagar_pessoais'::regclass),
  (select coalesce(string_agg(to_jsonb(x)::text,'|' order by x.policyname),'') from (
    select policyname,cmd,roles,permissive,qual,with_check from pg_policies
    where schemaname='public' and tablename='contas_pagar_pessoais') x),
  (select string_agg(concat(r,':',p,':',v),'|' order by r,p) from (
    select r,p,case when r='PUBLIC' then exists(
      select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      where a.grantee=0 and upper(a.privilege_type)=p)
     else has_table_privilege(r,'public.contas_pagar_pessoais',p) end v
    from unnest(array['authenticated','anon','PUBLIC']) r
    cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
    cross join lateral (select relacl,relowner from pg_class where oid='public.contas_pagar_pessoais'::regclass) c) q),
  (select coalesce(string_agg(concat(p.oid::regprocedure::text,':',p.prosecdef,':',coalesce(array_to_string(p.proconfig,','),''),':',
    has_function_privilege('authenticated',p.oid,'EXECUTE'),':',has_function_privilege('anon',p.oid,'EXECUTE'),':',
    exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE')),
    '|' order by p.oid::regprocedure::text),'')
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
    'criar_parcelamento_conta_pessoal','criar_parcelamento_conta_pessoal_com_entrada',
    'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal','atualizar_metadados_grupo_conta_pessoal'))
 )) fingerprint
), policy_checks as (
 select
  count(*)=4 and array_agg(policyname order by policyname)=array[
   'contas_pagar_pessoais_delete_proprietario','contas_pagar_pessoais_insert_proprietario',
   'contas_pagar_pessoais_select_proprietario','contas_pagar_pessoais_update_proprietario']::name[] policies_exatas,
  bool_and(permissive='PERMISSIVE' and roles=array['authenticated']::name[]
   and coalesce(qual,with_check) ilike '%auth.uid()%'
   and coalesce(qual,with_check) ilike '%proprietario_id%'
   and coalesce(qual,with_check) ilike '%empresa_id%'
   and coalesce(qual,with_check) ilike '%usuarios%') isolamento_semantico,
  not bool_or(coalesce(btrim(qual),'') in ('true','(true)') or coalesce(btrim(with_check),'') in ('true','(true)')
   or roles && array['anon','public']::name[]) sem_policy_ampla
 from pg_policies where schemaname='public' and tablename='contas_pagar_pessoais'
), rpc_checks as (
 select count(*)>=3 rpcs_relacionadas_presentes,
  bool_and(not p.prosecdef and p.proconfig @> array['search_path=""']::text[]
   and has_function_privilege('authenticated',p.oid,'EXECUTE')
   and not has_function_privilege('anon',p.oid,'EXECUTE')
   and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where a.grantee=0 and a.privilege_type='EXECUTE')) rpcs_invoker_restritas
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
  'criar_parcelamento_conta_pessoal','criar_parcelamento_conta_pessoal_com_entrada',
  'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal','atualizar_metadados_grupo_conta_pessoal')
)
select
 (select count(*) from public.contas_pagar_pessoais)=43 cpp_43_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pago')=21 pagos_21_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pendente')=22 pendentes_22_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Cancelada')=0 canceladas_zero_ok,
 (select coalesce(sum(valor),0) from public.contas_pagar_pessoais)=41574.73 total_ok,
 (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id is not null)=24 parcelas_24_ok,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)=0 eventos_zero_ok,
 not exists(select 1 from information_schema.columns where table_schema='public' and table_name='despesas'
  and column_name in ('pagamento_evento_id','origem_tipo','estorno_evento_id','estornada_em')) integracao_despesas_ausente_ok,
 to_regclass('public.contas_pagar_pessoais_recorrencias') is null header_ausente_ok,
 not exists(select 1 from information_schema.columns where table_schema='public' and table_name='contas_pagar_pessoais'
  and column_name in ('recorrencia_id','competencia','valor_previsto')) colunas_ausentes_ok,
 not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  and p.proname in ('criar_recorrencia_conta_pessoal','materializar_competencia_conta_pessoal',
   'atualizar_recorrencia_conta_pessoal','ajustar_competencia_recorrente_pessoal',
   'cancelar_competencia_recorrente_pessoal','encerrar_recorrencia_conta_pessoal')) rpcs_recorrencia_ausentes_ok,
 (select count(*) from public.contas_fixas)=8 fixas_8_ok,
 (select count(*) from public.contas_fixas where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)=6 fixas_mauro_6_ok,
 (select coalesce(sum(valor),0) from public.contas_fixas where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)=3608.53 fixas_total_ok,
 (select count(*) from public.contas_fixas where id=10 and empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and descricao='financimento moto CB300' and valor=1308 and dia_vencimento=27)=1 id10_bloqueado_migracao_automatica_ok,
 (select array_agg(id order by id) from public.contas_fixas where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)=array[5,6,7,8,9,10]::bigint[] ids_ok,
 (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais'::regclass) rls_habilitada_ok,
 not (select rolbypassrls from pg_roles where rolname='authenticated') authenticated_sem_bypassrls_ok,
 not (select rolbypassrls from pg_roles where rolname='anon') anon_sem_bypassrls_ok,
 pc.policies_exatas policies_exatas_ok,pc.isolamento_semantico policies_auth_tenant_owner_ok,
 pc.sem_policy_ampla sem_policy_ampla_ok,
 has_table_privilege('authenticated','public.contas_pagar_pessoais','SELECT,INSERT,UPDATE,DELETE') authenticated_crud_ok,
 not has_table_privilege('authenticated','public.contas_pagar_pessoais','TRUNCATE,REFERENCES,TRIGGER') authenticated_sem_admin_ok,
 not has_table_privilege('anon','public.contas_pagar_pessoais','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') anon_sem_acesso_ok,
 not exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where c.oid='public.contas_pagar_pessoais'::regclass and a.grantee=0) public_sem_acesso_ok,
 rc.rpcs_relacionadas_presentes,rc.rpcs_invoker_restritas rpcs_atuais_privilegios_ok,
 pc.isolamento_semantico futuras_policies_compativeis_com_novas_colunas_ok,
 to_regclass('public.contas_pagar_pessoais_recorrencias') is null futura_tabela_ainda_ausente_sem_exposicao_anon_ok,
 ss.fingerprint='5cfe5d9826b9df1494e8750177e3056e' security_baseline_inalterado_ok,
 ss.fingerprint security_baseline_fingerprint
from security_state ss cross join policy_checks pc cross join rpc_checks rc;
