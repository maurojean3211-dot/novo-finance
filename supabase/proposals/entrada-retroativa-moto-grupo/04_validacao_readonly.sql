-- Validação futura somente leitura.
select h.*,e.id evento_id,e.tipo,e.valor_pago,e.pago_em,e.idempotency_key evento_idempotency
from public.contas_pagar_pessoais_entradas h left join public.contas_pagar_pessoais_pagamento_eventos e on e.entrada_id=h.id
where h.grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid;
select count(*)=24 parcelas_24_ok,sum(valor)=31392 total_ok,
 count(*) filter(where status='Pago')=5 pagas_5_ok,count(*) filter(where status='Pendente')=19 pendentes_19_ok,
 count(distinct entrada_id)=1 entrada_unica_ok,
 min(valor)=1308 and max(valor)=1308 valores_ok,
 min(parcela_numero)=1 and max(parcela_numero)=24 numeracao_ok
from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid;
select not exists(select 1 from information_schema.columns where table_schema='public' and table_name='despesas'
 and column_name='pagamento_evento_id') integracao_despesas_ainda_ausente_ok;
