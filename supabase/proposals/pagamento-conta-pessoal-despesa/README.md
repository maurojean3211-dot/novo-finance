# Proposta A — Pagamento de conta pessoal para despesa

Status: **somente proposta local; não executar**.

## Objetivo

Uma operação transacional deverá marcar uma linha de `contas_pagar_pessoais` como `Pago` e manter exatamente uma linha correspondente em `despesas`. O vínculo deverá ser físico, tenant-aware e auditável; descrição e valor não serão usados como chave.

## Modelo proposto

- adicionar em `despesas` os campos opcionais `proprietario_id`, `conta_pagar_pessoal_id`, `pagamento_pessoal_status` e `pagamento_pessoal_estornado_em`;
- criar unicidade para `despesas.conta_pagar_pessoal_id`, impedindo duas despesas para a mesma conta mesmo sob concorrência;
- criar FK composta por conta, empresa e proprietário;
- criar `contas_pagar_pessoais_pagamento_eventos`, append-only, para registrar pagamento e estorno;
- expor uma função transacional única para pagar/reabrir, com `SECURITY INVOKER`, checagem de `auth.uid()` e tenant;
- ao reabrir, preservar a despesa e marcá-la inativa/estornada; um novo pagamento reutiliza a mesma linha.

## Bloqueio atual

O preflight remoto de 2026-08-15 encontrou em `despesas` a policy autenticada `liberar tudo despesas`, com `qual = true` e `with_check = true`. A proposta deve abortar enquanto essa policy existir. O hardening de `despesas` precisa de aprovação própria antes desta mudança.

## Ordem futura

1. aprovar hardening separado de `despesas`;
2. executar `01_preflight_readonly.sql`;
3. revisar e transformar o desenho de `02_estrutura_e_rpc_proposta.sql` em migration controlada;
4. validar concorrência com dados descartáveis em ambiente isolado;
5. executar `03_validacao_readonly.sql`.

Nenhum SQL desta pasta foi executado.
