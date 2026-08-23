-- SOMENTE LEITURA. Não chama RPCs e não cria eventos/despesas.
-- Executar imediatamente após uma aplicação futura e controlada de 02.
select column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public' and table_name='despesas'
 and column_name in ('proprietario_id','pagamento_evento_id','origem_tipo','estorno_evento_id','estornada_em')
order by ordinal_position;

select conname,contype,pg_get_constraintdef(oid) definicao
from pg_constraint where conrelid in (
 'public.despesas'::regclass,'public.contas_pagar_pessoais_pagamento_eventos'::regclass)
 and (conname like 'despesas_%evento%' or conname like 'despesas_integracao%'
  or conname in ('cpp_pag_eventos_origem_tipo_scope_key','cpp_pag_eventos_estorno_scope_key'))
order by conname;

select tgname,pg_get_triggerdef(t.oid) definicao
from pg_trigger t where t.tgrelid='public.despesas'::regclass and not t.tgisinternal
order by tgname;

select policyname,cmd,roles,permissive,qual,with_check
from pg_policies where schemaname='public' and tablename='despesas' order by policyname;

select p.oid::regprocedure assinatura,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_executa,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_executa,
 exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where a.grantee=0 and a.privilege_type='EXECUTE') public_executa
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal',
 'criar_parcelamento_conta_pessoal_com_entrada','materializar_despesa_evento_entrada_pessoal')
order by p.oid::regprocedure::text;

select e.*,md5(to_jsonb(e)::text) fingerprint_evento
from public.contas_pagar_pessoais_pagamento_eventos e order by criado_em,id;
select h.*,md5(to_jsonb(h)::text) fingerprint_entrada
from public.contas_pagar_pessoais_entradas h order by criado_em,id;

select
 (select count(*) from public.despesas)=11 despesas_11_preservadas,
 (select count(*) from public.despesas where tipo='receita')=8 receitas_8_preservadas,
 (select coalesce(sum(valor),0) from public.despesas where tipo='receita')=14396 receitas_total_preservado,
 (select count(*) from public.despesas where tipo='despesa')=3 despesas_3_preservadas,
 (select coalesce(sum(valor),0) from public.despesas where tipo='despesa')=1585.80 despesas_total_preservado,
 (select count(*) from public.despesas where pagamento_evento_id is not null)=0 zero_integradas_apos_migration,
 (select count(*) from public.despesas where proprietario_id is not null or origem_tipo is not null
  or estorno_evento_id is not null or estornada_em is not null)=0 historico_novas_colunas_null,
 (select md5(string_agg((to_jsonb(d)-'proprietario_id'-'pagamento_evento_id'-'origem_tipo'-
  'estorno_evento_id'-'estornada_em')::text,'|' order by id)) from public.despesas d)
  ='fe48fb20456c0ed9bb3b9a70fc26e5ae' fingerprint_historico_preservado,
 (select md5(string_agg((to_jsonb(d)-'proprietario_id'-'pagamento_evento_id'-'origem_tipo'-
  'estorno_evento_id'-'estornada_em')::text,'|' order by id) filter(where tipo='receita'))
  from public.despesas d)='4bf9a5ab8acf5c294ffeda87ebf26eb5' fingerprint_receitas_preservado,
 (select md5(string_agg((to_jsonb(d)-'proprietario_id'-'pagamento_evento_id'-'origem_tipo'-
  'estorno_evento_id'-'estornada_em')::text,'|' order by id) filter(where tipo='despesa'))
  from public.despesas d)='a196c2193f6f0402c11f8404072fc374' fingerprint_despesas_preservado,
 (select count(*) from public.contas_pagar_pessoais)=43 obrigacoes_43_preservadas,
 (select count(*) from public.contas_pagar_pessoais where status='Pago')=21 pagas_21_preservadas,
 (select count(*) from public.contas_pagar_pessoais where status='Pendente')=22 pendentes_22_preservadas,
 (select coalesce(sum(valor),0) from public.contas_pagar_pessoais)=41574.73 nominal_preservado,
 (select md5(string_agg(to_jsonb(p)::text,'|' order by id)) from public.contas_pagar_pessoais p)
  ='66e1af3fb3bd3acdd7482f0b8f1335f8' obrigacoes_fingerprint_preservado,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)=1 evento_unico_preservado,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos e
  where e.id='810ee061-bfcf-4377-aa0c-de13d164bd3b'::uuid
   and md5(to_jsonb(e)::text)='e8c42a74a4b25768ed5f9882e0d894de')=1 evento_moto_preservado,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos
  where tipo in ('Pagamento','Antecipacao','Estorno'))=0 sem_backfill_21_pagamentos,
 (select count(*) from public.contas_pagar_pessoais_entradas)=1 entrada_unica_preservada,
 (select count(*) from public.contas_pagar_pessoais_entradas h
  where h.id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid
   and md5(to_jsonb(h)::text)='22dd1f59b6c45c64754e5e890f5f5826')=1 entrada_moto_preservada,
 (select count(*) from public.contas_pagar_pessoais
  where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid)=24 parcelas_24_preservadas,
 (select count(*) from public.contas_pagar_pessoais
  where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid and status='Pago')=5 parcelas_5_pagas_preservadas,
 (select count(*) from public.contas_pagar_pessoais
  where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid and status='Pendente')=19 parcelas_19_pendentes_preservadas,
 (select array_agg(policyname order by policyname) from pg_policies
  where schemaname='public' and tablename='despesas')=array[
   'despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::name[]
  policies_exatas,
 (select relrowsecurity from pg_class where oid='public.despesas'::regclass) rls_habilitada,
 not exists(select 1 from pg_policies where schemaname='public' and tablename='despesas'
  and (coalesce(btrim(qual),'') in ('true','(true)') or coalesce(btrim(with_check),'') in ('true','(true)')))
  sem_policy_ampla,
 not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename='despesas'
  and (p.roles is distinct from array['authenticated']::name[] or p.permissive<>'PERMISSIVE'
   or (p.cmd in ('SELECT','UPDATE','DELETE') and (coalesce(p.qual,'') not like '%auth.uid()%'
    or coalesce(p.qual,'') not like '%empresa_id%' or coalesce(p.qual,'') not like '%proprietario_id%'))
   or (p.cmd in ('INSERT','UPDATE') and (coalesce(p.with_check,'') not like '%auth.uid()%'
    or coalesce(p.with_check,'') not like '%empresa_id%' or coalesce(p.with_check,'') not like '%proprietario_id%'))
   or (p.cmd='DELETE' and (coalesce(p.qual,'') not like '%pagamento_evento_id%IS NULL%'
    or coalesce(p.qual,'') not like '%proprietario_id%IS NULL%')))) isolamento_policies_despesas_ok,
 (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
  select policyname,cmd,roles,permissive,qual,with_check from pg_policies
  where schemaname='public' and tablename='contas_pagar_pessoais_pagamento_eventos') x)
  ='706125c655e0432559190e3d3c69d671' policies_eventos_preservadas,
 (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
  select policyname,cmd,roles,permissive,qual,with_check from pg_policies
  where schemaname='public' and tablename='contas_pagar_pessoais_entradas') x)
  ='5b039610b1c0def3c2926c45e1d58a4c' policies_entradas_preservadas,
 to_regprocedure('public.validar_despesa_evento_pessoal()') is not null trigger_funcao_presente,
 exists(select 1 from pg_trigger where tgrelid='public.despesas'::regclass
  and tgname='despesas_evento_pessoal_integridade' and not tgisinternal) trigger_presente,
 to_regprocedure('public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)') is not null
  rpc_materializacao_entrada_presente,
 (select bool_and(not p.prosecdef and p.proconfig @> array['search_path=""']::text[]
   and has_function_privilege('authenticated',p.oid,'EXECUTE')
   and not has_function_privilege('anon',p.oid,'EXECUTE')
   and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where a.grantee=0 and a.privilege_type='EXECUTE'))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
   'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal',
   'criar_parcelamento_conta_pessoal_com_entrada','materializar_despesa_evento_entrada_pessoal')) rpcs_seguras;
