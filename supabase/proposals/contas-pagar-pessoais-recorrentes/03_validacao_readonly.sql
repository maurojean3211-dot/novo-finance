-- VALIDAÇÃO PÓS-APLICAÇÃO SOMENTE LEITURA.
select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns
where table_schema='public' and table_name in ('contas_pagar_pessoais','contas_pagar_pessoais_recorrencias')
order by table_name,ordinal_position;
select conrelid::regclass tabela,conname,contype,pg_get_constraintdef(oid) definicao from pg_constraint
where conrelid in ('public.contas_pagar_pessoais'::regclass,'public.contas_pagar_pessoais_recorrencias'::regclass)
order by tabela::text,conname;
select tablename,indexname,indexdef from pg_indexes where schemaname='public'
and tablename in ('contas_pagar_pessoais','contas_pagar_pessoais_recorrencias') order by tablename,indexname;
select tablename,policyname,cmd,roles,permissive,qual,with_check from pg_policies
where schemaname='public' and tablename='contas_pagar_pessoais_recorrencias' order by policyname;
select p.oid::regprocedure assinatura,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_executa,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_executa
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('criar_recorrencia_conta_pessoal','materializar_competencia_conta_pessoal','atualizar_recorrencia_conta_pessoal',
  'ajustar_competencia_recorrente_pessoal','cancelar_competencia_recorrente_pessoal','encerrar_recorrencia_conta_pessoal')
order by assinatura::text;
select
 (select count(*) from public.contas_pagar_pessoais)=43 historico_43_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pago')=21 pagos_21_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pendente')=22 pendentes_22_ok,
 (select coalesce(sum(valor),0) from public.contas_pagar_pessoais)=41574.73 total_ok,
 (select count(*) from public.contas_pagar_pessoais where recorrencia_id is not null)=0 zero_competencias_ok,
 (select count(*) from public.contas_pagar_pessoais_recorrencias)=0 zero_series_ok,
 (select count(*) from public.contas_fixas)=8 fixas_8_preservadas_ok,
 (select count(*) from public.contas_fixas where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)=6 fixas_mauro_preservadas_ok,
 (select count(*) from public.contas_fixas where id=10 and descricao='financimento moto CB300')=1 id10_preservado_ok,
 (select count(*) from pg_policies where schemaname='public' and tablename='contas_pagar_pessoais_recorrencias')=3 policies_3_ok,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
  ('criar_recorrencia_conta_pessoal','materializar_competencia_conta_pessoal','atualizar_recorrencia_conta_pessoal',
   'ajustar_competencia_recorrente_pessoal','cancelar_competencia_recorrente_pessoal','encerrar_recorrencia_conta_pessoal'))=6 rpcs_6_ok,
 not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
  ('criar_recorrencia_conta_pessoal','materializar_competencia_conta_pessoal','atualizar_recorrencia_conta_pessoal',
   'ajustar_competencia_recorrente_pessoal','cancelar_competencia_recorrente_pessoal','encerrar_recorrencia_conta_pessoal')
  and (p.prosecdef or p.proconfig is null or p.proconfig[1] not in ('search_path=','search_path=""'))) invoker_path_ok;
