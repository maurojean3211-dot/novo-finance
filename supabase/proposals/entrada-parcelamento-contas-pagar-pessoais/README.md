# Compra com entrada + saldo parcelado — proposta local

Status: **PROPOSTA LOCAL ATUALIZADA — NÃO EXECUTADA**.

## Auditoria

A estrutura atual reutiliza com segurança `grupo_parcelamento_id`, `parcela_numero`, `parcelas_total`, `valor_total_compra`, `periodicidade` e `idempotency_key`. Ela não possui um local único para `valor_entrada`, `data_entrada` e `saldo_financiado`. Repetir esses dados nas 24 parcelas existentes ou em novas parcelas facilitaria divergência e soma duplicada.

O remoto contém agora 43 linhas: 19 históricas sem parcelamento e um grupo real com 24 parcelas (5 pagas, 19 pendentes), total R$ 31.392,00. Esse grupo não será alterado nem presumido como compra com entrada.

## Modelo proposto

Criar `public.contas_pagar_pessoais_entradas`, uma linha imutável por compra com entrada:

- `id` e `grupo_parcelamento_id`;
- `empresa_id` e `proprietario_id`;
- `idempotency_key`;
- `valor_total_compra`, `valor_entrada`, `saldo_financiado`;
- `data_entrada`, timestamps.

Adicionar `entrada_id` nullable às parcelas. Registros históricos e o grupo atual permanecem `NULL`. Uma FK composta impede vínculo cruzado entre tenant/proprietário.

Criar uma RPC nova, `criar_parcelamento_conta_pessoal_com_entrada`. A RPC atual permanece intacta e retrocompatível. A nova RPC, `SECURITY INVOKER`, em uma transação:

1. valida `auth.uid()` e tenant;
2. serializa pela chave idempotente;
3. registra uma única entrada e um único evento append-only `Entrada`, sem criar Despesa;
4. calcula `saldo_financiado = total - entrada` em centavos;
5. cria somente as parcelas do saldo;
6. vincula todas pelo mesmo `entrada_id` e grupo;
7. vincula o evento à entrada por FK composta e unicidade física;
8. numa repetição idêntica revalida cabeçalho, parcelas e evento e retorna o lote existente; conteúdo divergente aborta.

## Compatibilidade com eventos ativos

A proposta atualizada preserva as RPCs `registrar_pagamento_conta_pessoal` e `estornar_pagamento_conta_pessoal`. Ela altera somente a policy de INSERT da tabela de eventos para admitir `Entrada` quando existir uma entrada do mesmo usuário/tenant, adiciona a FK composta de escopo e um índice único parcial que impede dois eventos `Entrada` para o mesmo cabeçalho.

A RPC nova permanece `SECURITY INVOKER`, com `search_path` vazio, lock transacional por chave idempotente e cálculo integral em centavos. A entrada e todas as parcelas são criadas na mesma transação; qualquer falha no evento desfaz o lote inteiro.

## Relatórios e Despesas

- Fluxo financeiro: somar `valor` das parcelas conforme período/status.
- Visão patrimonial da compra: ler uma vez o cabeçalho da entrada.
- Percentual quitado: `(valor_entrada + parcelas pagas) / valor_total_compra`.
- A entrada não entra automaticamente em `despesas`; o evento registra apenas o desembolso real na trilha financeira.
- A integração futura deverá criar exatamente uma despesa de entrada, usando `entrada_id` como referência idempotente, e registrar estorno auditável sem apagar histórico.

## Front-end futuro

Após migration/RPC aprovadas: alterar `PersonalPayableModal.jsx`, `ContasPagarPessoaisPage.jsx`, `personalFinance.service.js`, `usePersonalFinanceRead.js`, `RelatoriosPessoaisPage.jsx` e o CSS pessoal. Nenhum deles foi alterado nesta auditoria.

## Rollback

`04_rollback_fail_closed.sql` só pode ser usado enquanto não existir nenhuma entrada, parcela vinculada ou evento `Entrada`. Depois do primeiro uso, o rollback aborta e qualquer correção deve ser roll-forward para preservar histórico financeiro.

## Riscos

- Como as funções são `SECURITY INVOKER`, `authenticated` precisa de INSERT nas tabelas envolvidas; RLS, FKs, constraints e unicidade limitam o escopo, mas o front-end deve usar exclusivamente a RPC.
- A entrada é registrada como evento pago, mas não compõe Despesas até a integração transacional futura.
- Edição/cancelamento em lote continua exigindo backend próprio.
- A migration deve abortar se o grupo real atual ou os 19 históricos divergirem.
