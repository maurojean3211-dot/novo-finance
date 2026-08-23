-- VALIDAÇÃO PÓS-APLICAÇÃO SOMENTE LEITURA. Todos os campos *_ok devem retornar true.
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public' and table_name in
 ('receitas_pessoais_recorrencias','receitas_pessoais_competencias','receitas_pessoais_competencia_eventos')
order by table_name,ordinal_position;

select conrelid::regclass tabela,conname,contype,pg_get_constraintdef(oid) definicao
from pg_constraint where conrelid in
 ('public.receitas_pessoais_recorrencias'::regclass,'public.receitas_pessoais_competencias'::regclass,
  'public.receitas_pessoais_competencia_eventos'::regclass)
order by conrelid::regclass::text,conname;

select tablename,indexname,indexdef from pg_indexes where schemaname='public'
and tablename in ('receitas_pessoais_recorrencias','receitas_pessoais_competencias','receitas_pessoais_competencia_eventos')
order by tablename,indexname;

select tablename,policyname,cmd,roles,permissive,qual,with_check from pg_policies
where schemaname='public' and tablename in
 ('receitas_pessoais_recorrencias','receitas_pessoais_competencias','receitas_pessoais_competencia_eventos')
order by tablename,policyname;

select p.oid::regprocedure assinatura,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_executa,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_executa,
 exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where a.grantee=0 and a.privilege_type='EXECUTE') public_executa
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('criar_receita_recorrente_pessoal','atualizar_receita_recorrente_pessoal','materializar_competencia_receita_pessoal',
  'editar_competencia_receita_pessoal','registrar_recebimento_receita_pessoal','cancelar_competencia_receita_pessoal',
  'reabrir_competencia_receita_pessoal') order by p.oid::regprocedure::text;

select
 to_regclass('public.receitas_pessoais_recorrencias') is not null series_existe_ok,
 to_regclass('public.receitas_pessoais_competencias') is not null competencias_existe_ok,
 to_regclass('public.receitas_pessoais_competencia_eventos') is not null eventos_existe_ok,
 (select count(*) from public.receitas_pessoais_recorrencias)=0 zero_series_ok,
 (select count(*) from public.receitas_pessoais_competencias)=0 zero_competencias_ok,
 (select count(*) from public.receitas_pessoais_competencia_eventos)=0 zero_eventos_ok,
 (select count(*) from public.despesas)=11 historico_11_ok,
 (select count(*) from public.despesas where tipo='receita')=8 receitas_8_ok,
 (select coalesce(sum(valor),0) from public.despesas where tipo='receita')=14396 receitas_total_ok,
 (select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.despesas d)='fe48fb20456c0ed9bb3b9a70fc26e5ae' fingerprint_total_ok,
 (select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.despesas d where tipo='receita')='4bf9a5ab8acf5c294ffeda87ebf26eb5' fingerprint_receitas_ok,
 (select array_agg(policyname order by policyname) from pg_policies where schemaname='public' and tablename='despesas')
  =array['despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::name[] policies_despesas_ok,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
  ('criar_receita_recorrente_pessoal','atualizar_receita_recorrente_pessoal','materializar_competencia_receita_pessoal',
   'editar_competencia_receita_pessoal','registrar_recebimento_receita_pessoal','cancelar_competencia_receita_pessoal',
   'reabrir_competencia_receita_pessoal'))=7 sete_rpcs_ok,
 not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
  ('criar_receita_recorrente_pessoal','atualizar_receita_recorrente_pessoal','materializar_competencia_receita_pessoal',
   'editar_competencia_receita_pessoal','registrar_recebimento_receita_pessoal','cancelar_competencia_receita_pessoal',
   'reabrir_competencia_receita_pessoal') and (p.prosecdef or p.proconfig is null or cardinality(p.proconfig)<>1
    or p.proconfig[1] not in ('search_path=','search_path=""'))) invoker_search_path_ok,
 not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%receita%pessoal%'
  and (has_function_privilege('anon',p.oid,'EXECUTE') or exists(
   select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   where a.grantee=0 and a.privilege_type='EXECUTE'))) sem_execucao_anon_public_ok;

select c.relname,
 c.relrowsecurity as rls_ok,
 not has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') as anon_sem_crud_ok,
 not exists(select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where a.grantee=0 and a.privilege_type in ('SELECT','INSERT','UPDATE','DELETE')) as public_sem_crud_ok
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
 ('receitas_pessoais_recorrencias','receitas_pessoais_competencias','receitas_pessoais_competencia_eventos')
order by c.relname;

select
 exists(select 1 from pg_constraint where conrelid='public.receitas_pessoais_competencias'::regclass
  and conname='receitas_competencias_mes_key' and contype='u') unicidade_mes_ok,
 not exists(select 1 from pg_policies where schemaname='public' and tablename like 'receitas_pessoais_%' and cmd='DELETE') sem_policy_delete_ok,
 (select count(*) from pg_policies where schemaname='public' and tablename='receitas_pessoais_recorrencias')=3 policies_series_ok,
 (select count(*) from pg_policies where schemaname='public' and tablename='receitas_pessoais_competencias')=3 policies_competencias_ok,
 (select count(*) from pg_policies where schemaname='public' and tablename='receitas_pessoais_competencia_eventos')=2 policies_eventos_ok;
