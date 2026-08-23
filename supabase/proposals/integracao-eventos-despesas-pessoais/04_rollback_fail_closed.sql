-- ROLLBACK PROPOSTO. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
-- Só remove a estrutura quando ela nunca foi usada. As definições originais das três RPCs
-- devem ser restauradas no mesmo transaction block antes de remover as colunas.
begin;
do $guards$
begin
 if (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)<>0
 or (select count(*) from public.contas_pagar_pessoais_entradas)<>0
 or (select count(*) from public.despesas where pagamento_evento_id is not null
  or estorno_evento_id is not null or proprietario_id is not null or origem_tipo is not null or estornada_em is not null)<>0 then
  raise exception 'ABORTADO: integração já utilizada; rollback destrutivo proibido, aplicar roll-forward';
 end if;
 if (select count(*) from public.despesas)<>4
 or (select md5(string_agg((to_jsonb(d)-'proprietario_id'-'pagamento_evento_id'-'origem_tipo'-'estorno_evento_id'-'estornada_em')::text,
  '|' order by id)) from public.despesas d)<>'6c0006ddb8f6bdf39e532c9d5ce04a58' then
  raise exception 'ABORTADO: histórico de despesas divergiu';
 end if;
end $guards$;

-- Fail-closed adicional: este artefato não tenta reconstruir funções a partir de texto dinâmico.
-- Antes de promover o rollback, copiar aqui as três definições exatas capturadas no preflight
-- e validar seus fingerprints. Sem essa incorporação, aborta antes de qualquer DROP.
do $nao_promovido$
begin
 raise exception 'ABORTADO INTENCIONALMENTE: rollback exige incorporar e validar as três definições originais das RPCs';
end $nao_promovido$;

-- Sequência autorizável somente após a restauração das RPCs:
-- drop policy ...; recriar as quatro policies tenant originais;
-- alter table public.despesas drop constraint/index/colunas da integração;
-- alter table public.contas_pagar_pessoais_pagamento_eventos
--   drop constraint cpp_pag_eventos_origem_tipo_scope_key,
--   drop constraint cpp_pag_eventos_estorno_scope_key;
rollback;
