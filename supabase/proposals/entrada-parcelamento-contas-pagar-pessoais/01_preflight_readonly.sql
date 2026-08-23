-- SOMENTE LEITURA. Estado imediatamente anterior à futura migration.
select count(*) total,count(*) filter(where status='Pago') pagas,
 count(*) filter(where status='Pendente') pendentes,count(*) filter(where status='Cancelada') canceladas,
 sum(valor) total_nominal,count(*) filter(where grupo_parcelamento_id is null) avulsos,
 count(*) filter(where grupo_parcelamento_id is not null) parcelas,
 md5(string_agg(to_jsonb(p)::text,'|' order by id)) fingerprint
from public.contas_pagar_pessoais p;

select grupo_parcelamento_id,count(*) quantidade,min(parcela_numero) primeira,max(parcela_numero) ultima,
 max(parcelas_total) total_declarado,sum(valor) soma,max(valor_total_compra) total_compra,
 count(*) filter(where status='Pago') pagas,count(*) filter(where status='Pendente') pendentes,
 sum(valor) filter(where status='Pendente') saldo_pendente,
 count(distinct empresa_id) tenants,count(distinct proprietario_id) proprietarios,
 count(distinct idempotency_key) chaves,md5(string_agg(to_jsonb(p)::text,'|' order by id)) fingerprint
from public.contas_pagar_pessoais p where grupo_parcelamento_id is not null group by grupo_parcelamento_id;

select count(*) eventos,count(*) filter(where tipo='Entrada') eventos_entrada,
 md5(string_agg(to_jsonb(e)::text,'|' order by id)) fingerprint_eventos
from public.contas_pagar_pessoais_pagamento_eventos e;

select to_regclass('public.contas_pagar_pessoais_entradas') tabela_entrada,
 (select count(*) from information_schema.columns where table_schema='public' and table_name='contas_pagar_pessoais' and column_name='entrada_id') coluna_entrada,
 to_regprocedure('public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)') rpc_entrada,
 to_regclass('public.contas_pagar_pessoais_pagamento_eventos') tabela_eventos,
 to_regprocedure('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)') rpc_pagamento,
 to_regprocedure('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)') rpc_estorno;

select tablename,policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename in ('contas_pagar_pessoais','contas_pagar_pessoais_pagamento_eventos','despesas')
order by tablename,policyname;

select
 (select count(*) from public.contas_pagar_pessoais)=43 total_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pago')=21 pagas_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Pendente')=22 pendentes_ok,
 (select count(*) from public.contas_pagar_pessoais where status='Cancelada')=0 canceladas_ok,
 (select sum(valor) from public.contas_pagar_pessoais)=41574.73 nominal_ok,
 (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)=24 moto_24_ok,
 (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and status='Pago')=5 moto_pagas_ok,
 (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and status='Pendente')=19 moto_pendentes_ok,
 (select sum(valor) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)=31392 moto_total_ok,
 (select sum(valor) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and status='Pendente')=24852 moto_saldo_ok,
 to_regclass('public.contas_pagar_pessoais_entradas') is null tabela_entrada_ausente,
 not exists(select 1 from information_schema.columns where table_schema='public' and table_name='contas_pagar_pessoais' and column_name='entrada_id') coluna_entrada_ausente,
 to_regprocedure('public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)') is null rpc_entrada_ausente,
 to_regclass('public.contas_pagar_pessoais_pagamento_eventos') is not null eventos_ativos,
 (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)=0 zero_eventos,
 (select array_agg(policyname order by policyname) from pg_policies where schemaname='public' and tablename='contas_pagar_pessoais_pagamento_eventos')=
  array['cpp_pag_eventos_insert_tenant','cpp_pag_eventos_select_tenant']::name[] policies_eventos_ok,
 (select array_agg(policyname order by policyname) from pg_policies where schemaname='public' and tablename='despesas')=
  array['despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::name[] despesas_ok,
 not exists(select 1 from pg_policies where schemaname='public' and tablename in ('contas_pagar_pessoais','contas_pagar_pessoais_pagamento_eventos','despesas') and (qual='true' or with_check='true')) sem_policy_ampla;
