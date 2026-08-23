-- SOMENTE LEITURA. Não chama RPC e não cria entrada.
select column_name,data_type,is_nullable,column_default from information_schema.columns
where table_schema='public' and table_name in ('contas_pagar_pessoais','contas_pagar_pessoais_entradas')
 and column_name in ('entrada_id','grupo_parcelamento_id','valor_total_compra','valor_entrada','saldo_financiado','data_entrada','idempotency_key')
order by table_name,column_name;

select conname,contype,pg_get_constraintdef(oid) definicao from pg_constraint
where conrelid in ('public.contas_pagar_pessoais_entradas'::regclass,'public.contas_pagar_pessoais_pagamento_eventos'::regclass)
 and (conrelid='public.contas_pagar_pessoais_entradas'::regclass or conname='cpp_pag_eventos_entrada_scope_fkey')
order by conname;

select indexname,indexdef from pg_indexes where schemaname='public'
 and indexname in ('contas_pagar_pessoais_entrada_idx','cpp_pag_eventos_entrada_unica_idx')
order by indexname;

select policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename in ('contas_pagar_pessoais_entradas','contas_pagar_pessoais_pagamento_eventos')
order by tablename,policyname;

select p.oid::regprocedure assinatura,p.prosecdef security_definer,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_executa,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_executa,
 has_function_privilege('public',p.oid,'EXECUTE') public_executa
from pg_proc p where p.oid='public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)'::regprocedure;

select count(*) total,count(*) filter(where entrada_id is not null) vinculadas_entrada,
 count(*) filter(where grupo_parcelamento_id is null and entrada_id is not null) vinculo_invalido,
 md5(string_agg(to_jsonb(p)::text,'|' order by id)) fingerprint
from public.contas_pagar_pessoais p;

select count(*) entradas,sum(valor_entrada) total_entradas,sum(saldo_financiado) total_financiado
from public.contas_pagar_pessoais_entradas;

select count(*) eventos,count(*) filter(where tipo='Entrada') eventos_entrada,
 md5(string_agg(to_jsonb(e)::text,'|' order by id)) fingerprint_eventos
from public.contas_pagar_pessoais_pagamento_eventos e;

select
 (select count(*) from public.contas_pagar_pessoais)=43 obrigacoes_preservadas,
 (select count(*) from public.contas_pagar_pessoais where entrada_id is not null)=0 historico_sem_entrada,
 (select count(*) from public.contas_pagar_pessoais_entradas)=0 zero_entradas,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)=0 zero_eventos,
 (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais_entradas'::regclass) rls_entrada,
 (select array_agg(policyname order by policyname) from pg_policies where schemaname='public' and tablename='contas_pagar_pessoais_entradas')=
  array['contas_pagar_pessoais_entradas_insert','contas_pagar_pessoais_entradas_select']::name[] policies_entrada_ok,
 not has_table_privilege('anon','public.contas_pagar_pessoais_entradas','SELECT') anon_sem_select,
 not has_table_privilege('anon','public.contas_pagar_pessoais_entradas','INSERT') anon_sem_insert,
 not has_table_privilege('authenticated','public.contas_pagar_pessoais_entradas','UPDATE') auth_sem_update,
 not has_table_privilege('authenticated','public.contas_pagar_pessoais_entradas','DELETE') auth_sem_delete;
