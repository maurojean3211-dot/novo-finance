-- SOMENTE LEITURA. Todos os campos *_ok devem ser true.
select date '2026-04-27' as data_entrada_confirmada_pelo_usuario;
select parcela_numero,id,empresa_id,proprietario_id,descricao,fornecedor,valor,vencimento,status,
 grupo_parcelamento_id,entrada_id,valor_total_compra,periodicidade,categoria,observacoes,criado_em,atualizado_em
from public.contas_pagar_pessoais
where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid order by parcela_numero;
select
 (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)=24 parcelas_24_ok,
 (select sum(valor) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)=31392 total_ok,
 (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and status='Pago')=5 pagas_5_ok,
 (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and status='Pendente')=19 pendentes_19_ok,
 (select count(distinct empresa_id) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)=1 tenant_unico_ok,
 (select count(distinct proprietario_id) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)=1 owner_unico_ok,
 (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and entrada_id is not null)=0 parcelas_sem_entrada_ok,
 not exists(select 1 from public.contas_pagar_pessoais_entradas where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid) header_ausente_ok,
 not exists(select 1 from public.contas_pagar_pessoais_pagamento_eventos e join public.contas_pagar_pessoais_entradas h on h.id=e.entrada_id
  where h.grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and e.tipo='Entrada') evento_ausente_ok,
 (select md5(string_agg(to_jsonb(p)::text,'|' order by parcela_numero)) from public.contas_pagar_pessoais p
  where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)='1f36adcebcc65603adc286d1e2636ed4' fingerprint_ok,
 exists(select 1 from auth.users a join public.usuarios u on u.id=a.id where a.email='maurojean3211@gmail.com'
  and a.id='8a85591b-2410-405f-8279-910dbcf61011'::uuid and u.empresa_id=a.id) identidade_ok,
 not exists(select 1 from information_schema.columns where table_schema='public' and table_name='despesas'
  and column_name='pagamento_evento_id') integracao_despesas_ausente_ok,
 to_regprocedure('public.registrar_entrada_retroativa_grupo_conta_pessoal(uuid,uuid,uuid,date,uuid)') is null rpc_ausente_ok;
