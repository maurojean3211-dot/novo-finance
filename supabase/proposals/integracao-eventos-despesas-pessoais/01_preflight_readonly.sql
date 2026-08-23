-- SOMENTE LEITURA. Não altera schema, dados, funções, privilégios ou policies.
-- Todos os campos *_ok devem retornar true.
select column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in (
 'despesas','contas_pagar_pessoais_pagamento_eventos','contas_pagar_pessoais_entradas')
order by table_name,ordinal_position;

select conrelid::regclass tabela,conname,contype,pg_get_constraintdef(oid) definicao
from pg_constraint
where conrelid in ('public.despesas'::regclass,
 'public.contas_pagar_pessoais_pagamento_eventos'::regclass,
 'public.contas_pagar_pessoais_entradas'::regclass)
order by conrelid::regclass::text,conname;

select tablename,policyname,cmd,roles,permissive,qual,with_check
from pg_policies where schemaname='public' and tablename in (
 'despesas','contas_pagar_pessoais_pagamento_eventos','contas_pagar_pessoais_entradas')
order by tablename,policyname;

select p.oid::regprocedure assinatura,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_executa,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_executa,
 exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where a.grantee=0 and a.privilege_type='EXECUTE') public_executa,
 md5(pg_get_functiondef(p.oid)) fingerprint
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal',
 'criar_parcelamento_conta_pessoal_com_entrada','materializar_despesa_evento_entrada_pessoal')
order by p.oid::regprocedure::text;

select count(*) total,count(*) filter(where tipo='receita') receitas,
 coalesce(sum(valor) filter(where tipo='receita'),0) total_receitas,
 count(*) filter(where tipo='despesa') despesas,
 coalesce(sum(valor) filter(where tipo='despesa'),0) total_despesas,
 md5(string_agg(to_jsonb(d)::text,'|' order by id)) fingerprint_total,
 md5(string_agg(to_jsonb(d)::text,'|' order by id) filter(where tipo='receita')) fingerprint_receitas,
 md5(string_agg(to_jsonb(d)::text,'|' order by id) filter(where tipo='despesa')) fingerprint_despesas
from public.despesas d;

select e.*,md5(to_jsonb(e)::text) fingerprint_evento
from public.contas_pagar_pessoais_pagamento_eventos e order by criado_em,id;
select h.*,md5(to_jsonb(h)::text) fingerprint_entrada
from public.contas_pagar_pessoais_entradas h order by criado_em,id;

select
 (select count(*) from public.despesas)=11 despesas_11_ok,
 (select count(*) from public.despesas where tipo='receita')=8 receitas_8_ok,
 (select coalesce(sum(valor),0) from public.despesas where tipo='receita')=14396 receitas_total_14396_ok,
 (select count(*) from public.despesas where tipo='despesa')=3 despesas_tipo_3_ok,
 (select coalesce(sum(valor),0) from public.despesas where tipo='despesa')=1585.80 despesas_total_1585_80_ok,
 (select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.despesas d)
  ='fe48fb20456c0ed9bb3b9a70fc26e5ae' despesas_fingerprint_ok,
 (select md5(string_agg(to_jsonb(d)::text,'|' order by id) filter(where tipo='receita')) from public.despesas d)
  ='4bf9a5ab8acf5c294ffeda87ebf26eb5' receitas_fingerprint_ok,
 (select md5(string_agg(to_jsonb(d)::text,'|' order by id) filter(where tipo='despesa')) from public.despesas d)
  ='a196c2193f6f0402c11f8404072fc374' despesas_tipo_fingerprint_ok,
 (select count(*) from public.contas_pagar_pessoais)=43 obrigacoes_43_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pago')=21 historicas_pagas_21_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pendente')=22 pendentes_22_ok,
 (select coalesce(sum(valor),0) from public.contas_pagar_pessoais)=41574.73 nominal_41574_73_ok,
 (select md5(string_agg(to_jsonb(p)::text,'|' order by id)) from public.contas_pagar_pessoais p)
  ='66e1af3fb3bd3acdd7482f0b8f1335f8' obrigacoes_fingerprint_ok,
 to_regclass('public.contas_pagar_pessoais_pagamento_eventos') is not null tabela_eventos_existe_ok,
 to_regclass('public.contas_pagar_pessoais_entradas') is not null tabela_entradas_existe_ok,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)=1 exatamente_um_evento_ok,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos where tipo='Entrada')=1 entrada_evento_1_ok,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos
  where tipo in ('Pagamento','Antecipacao','Estorno'))=0 sem_backfill_21_pagamentos_ok,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos e where
  e.id='810ee061-bfcf-4377-aa0c-de13d164bd3b'::uuid
  and e.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and e.proprietario_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and e.conta_pagar_pessoal_id is null
  and e.entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid
  and e.tipo='Entrada' and e.valor_nominal=8750 and e.valor_pago=8750 and e.desconto_obtido=0
  and e.pago_em=date '2026-04-27'
  and e.idempotency_key='52e20038-b0fc-4465-8727-cb1a48072c37'::uuid
  and e.estorno_de_evento_id is null and e.autor_id=e.proprietario_id
  and md5(to_jsonb(e)::text)='e8c42a74a4b25768ed5f9882e0d894de')=1 evento_moto_exato_ok,
 (select count(*) from public.contas_pagar_pessoais_entradas)=1 exatamente_uma_entrada_ok,
 (select count(*) from public.contas_pagar_pessoais_entradas h where
  h.id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid
  and h.grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid
  and h.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and h.proprietario_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and h.idempotency_key='52e20038-b0fc-4465-8727-cb1a48072c37'::uuid
  and h.descricao='MOTO CBR 300' and h.fornecedor='BANCO PAN'
  and h.valor_total_compra=40142 and h.valor_entrada=8750 and h.saldo_financiado=31392
  and h.data_entrada=date '2026-04-27' and h.parcelas_total=24
  and h.primeiro_vencimento=date '2026-05-27' and h.periodicidade='Mensal'
  and md5(to_jsonb(h)::text)='22dd1f59b6c45c64754e5e890f5f5826')=1 entrada_moto_exata_ok,
 (select count(*) from public.contas_pagar_pessoais
  where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid)=24 parcelas_entrada_24_ok,
 (select coalesce(sum(valor),0) from public.contas_pagar_pessoais
  where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid)=31392 parcelas_entrada_total_ok,
 (select count(*) from public.contas_pagar_pessoais
  where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid and status='Pago')=5 parcelas_entrada_5_pagas_ok,
 (select count(*) from public.contas_pagar_pessoais
  where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid and status='Pendente')=19 parcelas_entrada_19_pendentes_ok,
 not exists(select 1 from information_schema.columns where table_schema='public' and table_name='despesas'
  and column_name in ('proprietario_id','pagamento_evento_id','origem_tipo','estorno_evento_id','estornada_em'))
  colunas_integracao_ausentes_ok,
 (select relrowsecurity from pg_class where oid='public.despesas'::regclass) despesas_rls_ok,
 (select array_agg(policyname order by policyname) from pg_policies
  where schemaname='public' and tablename='despesas')=array[
   'despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::name[]
  policies_despesas_exatas_ok,
 (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='despesas') x)='f7fdc53d58a8e80da08040d7d19ef559'
  policies_despesas_fingerprint_ok,
 not exists(select 1 from pg_policies where schemaname='public' and tablename in (
  'despesas','contas_pagar_pessoais_pagamento_eventos','contas_pagar_pessoais_entradas')
  and (coalesce(btrim(qual),'') in ('true','(true)') or coalesce(btrim(with_check),'') in ('true','(true)')))
  sem_policy_ampla_ok,
 (select relrowsecurity from pg_class
  where oid='public.contas_pagar_pessoais_pagamento_eventos'::regclass) eventos_rls_ok,
 (select relrowsecurity from pg_class
  where oid='public.contas_pagar_pessoais_entradas'::regclass) entradas_rls_ok,
 (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais_pagamento_eventos') x)
  ='706125c655e0432559190e3d3c69d671' eventos_policies_fingerprint_ok,
 (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais_entradas') x)
  ='5b039610b1c0def3c2926c45e1d58a4c' entradas_policies_fingerprint_ok,
 has_table_privilege('authenticated','public.contas_pagar_pessoais_pagamento_eventos','SELECT,INSERT')
  eventos_auth_select_insert_ok,
 not has_table_privilege('authenticated','public.contas_pagar_pessoais_pagamento_eventos','UPDATE,DELETE')
  eventos_append_only_privilegios_ok,
 has_table_privilege('authenticated','public.contas_pagar_pessoais_entradas','SELECT,INSERT')
  entradas_auth_select_insert_ok,
 not has_table_privilege('authenticated','public.contas_pagar_pessoais_entradas','UPDATE,DELETE')
  entradas_append_only_privilegios_ok,
 not has_table_privilege('anon','public.contas_pagar_pessoais_pagamento_eventos','SELECT,INSERT,UPDATE,DELETE')
  eventos_anon_sem_crud_ok,
 not has_table_privilege('anon','public.contas_pagar_pessoais_entradas','SELECT,INSERT,UPDATE,DELETE')
  entradas_anon_sem_crud_ok,
 not exists(select 1 from pg_class c where c.oid in (
   'public.contas_pagar_pessoais_pagamento_eventos'::regclass,
   'public.contas_pagar_pessoais_entradas'::regclass)
  and exists(select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
   where a.grantee=0)) eventos_entradas_public_sem_privilegios_ok,
 to_regprocedure('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)') is not null
  rpc_pagamento_ok,
 to_regprocedure('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)') is not null rpc_estorno_ok,
 to_regprocedure('public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)') is not null
  rpc_entrada_ok,
 (select md5(pg_get_functiondef('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)'::regprocedure)))
  ='11aef200290b71bc86ae5869ea7ac394' rpc_pagamento_fingerprint_ok,
 (select md5(pg_get_functiondef('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)'::regprocedure)))
  ='f10da628279aa80dffa659f9793bfa1f' rpc_estorno_fingerprint_ok,
 (select md5(pg_get_functiondef('public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)'::regprocedure)))
  ='7bb363dde40fcc39a0d9ab8a19a35e81' rpc_entrada_fingerprint_ok,
 to_regprocedure('public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)') is null
  rpc_materializacao_entrada_ausente_ok,
 not exists(select 1 from public.despesas d where d.tipo='despesa' and d.valor=8750
  and d.data_lancamento=date '2026-04-27'
  and d.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid) sem_despesa_entrada_moto_ok,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos e
  join public.contas_pagar_pessoais_entradas h on h.id=e.entrada_id
  where e.id='810ee061-bfcf-4377-aa0c-de13d164bd3b'::uuid and e.tipo='Entrada'
   and e.valor_pago=8750 and e.pago_em=date '2026-04-27'
   and e.empresa_id=h.empresa_id and e.proprietario_id=h.proprietario_id
   and h.id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid)=1
  evento_entrada_materializavel_idempotentemente_apos_migration_ok;
