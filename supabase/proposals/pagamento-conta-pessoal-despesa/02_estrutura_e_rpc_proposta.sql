-- PROPOSTA NÃO EXECUTÁVEL NESTA ETAPA.
-- Antes de virar migration, exige hardening aprovado de public.despesas e teste concorrente isolado.
-- Fail-closed obrigatório: abortar se existir policy ampla autenticada em despesas.

begin;

do $guard$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'despesas'
      and 'authenticated' = any(roles)
      and coalesce(qual, '') = 'true'
  ) then
    raise exception 'ABORTADO: despesas ainda possui policy autenticada com qual=true';
  end if;
end $guard$;

-- Desenho proposto, a ser revisado e promovido para migration somente após nova autorização:
-- 1. unique (id, empresa_id, proprietario_id) em contas_pagar_pessoais;
-- 2. colunas nullable em despesas:
--      proprietario_id uuid references auth.users(id),
--      conta_pagar_pessoal_id uuid unique,
--      pagamento_pessoal_status text check (...),
--      pagamento_pessoal_estornado_em timestamptz;
-- 3. FK composta (conta_pagar_pessoal_id, empresa_id, proprietario_id)
--    -> contas_pagar_pessoais (id, empresa_id, proprietario_id);
-- 4. tabela append-only contas_pagar_pessoais_pagamento_eventos com
--    conta_id, despesa_id, empresa_id, proprietario_id, ação, ocorrido_em e idempotency_key unique;
-- 5. função SECURITY INVOKER, revogada de PUBLIC/anon e concedida somente a authenticated,
--    que bloqueia a conta, verifica auth.uid()/tenant, atualiza o status, faz UPSERT pela
--    unique conta_pagar_pessoal_id e registra um evento imutável na mesma transação;
-- 6. reabertura marca a despesa como inativa/estornada e registra evento; nunca faz DELETE.

do $nao_executar$
begin
  raise exception 'ABORTADO INTENCIONALMENTE: arquivo é apenas desenho local, não migration';
end $nao_executar$;
rollback;
