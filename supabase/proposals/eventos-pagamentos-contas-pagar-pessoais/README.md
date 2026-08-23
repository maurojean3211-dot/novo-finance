# Eventos de pagamento de Contas a Pagar Pessoais

Status: **proposta local não executada remotamente**. O pacote cria futuramente uma trilha append-only de pagamentos e estornos sem reescrever valor nominal, vencimento, grupo ou número das obrigações existentes.

## Estado protegido pelos guards

- 43 obrigações em public.contas_pagar_pessoais;
- 21 Pago, 22 Pendente e nenhuma Cancelada;
- total nominal de R$ 41.574,73;
- um grupo real com 24 parcelas, 5 pagas e 19 pendentes, total de R$ 31.392,00;
- nenhuma tabela ou RPC de eventos existente;
- hardening de public.despesas presente com somente quatro policies por tenant;
- nenhum backfill automático dos 21 registros historicamente pagos.

O preflight produz um fingerprint das 43 linhas. A validação pós-aplicação repete o fingerprint; como a migration cria apenas objetos e um índice composto, o resultado deve permanecer idêntico.

## Objetos criados

1. Índice único contas_pagar_pessoais_scope_key em (id, empresa_id, proprietario_id), necessário para a FK composta.
2. Tabela public.contas_pagar_pessoais_pagamento_eventos.
3. Índices cpp_pag_eventos_conta_idx e cpp_pag_eventos_tipo_data_idx.
4. Policies cpp_pag_eventos_select_tenant e cpp_pag_eventos_insert_tenant.
5. RPCs registrar_pagamento_conta_pessoal e estornar_pagamento_conta_pessoal.

Nenhum objeto de public.despesas é alterado.

## Modelo append-only

- Pagamento: valor pago igual ao nominal.
- Antecipacao: valor efetivo entre zero e o nominal, com desconto calculado.
- Entrada: reservado para integração futura.
- Estorno: evento compensatório que referencia um evento original.

Eventos não podem ser atualizados nem excluídos por authenticated: não existem policies ou grants de UPDATE/DELETE. Estorno cria outra linha e mantém o evento original.

entrada_id é reserva estrutural sem FK nesta etapa. A policy de INSERT bloqueia Entrada; nenhuma entrada pode ser criada antes da proposta específica definir tabela, FK composta e RPC atômica.

## RPC de pagamento

registrar_pagamento_conta_pessoal:

- SECURITY INVOKER com search_path vazio;
- exige auth.uid() = proprietario_id;
- confirma usuarios.id = auth.uid() e o mesmo empresa_id;
- bloqueia a obrigação com FOR UPDATE;
- não exige pagamento das parcelas anteriores;
- aceita somente obrigação Pendente;
- preserva contas_pagar_pessoais.valor;
- grava evento e muda status para Pago na mesma transação;
- usa chave única (empresa_id, proprietario_id, idempotency_key);
- devolve o mesmo evento em repetição idempotente compatível e falha se o conteúdo divergir.

O lock da obrigação serializa pagamentos concorrentes, inclusive com chaves diferentes.

## RPC de estorno

estornar_pagamento_conta_pessoal:

- aceita somente evento original Pagamento ou Antecipacao;
- bloqueia a obrigação com FOR UPDATE e revalida o evento original sob esse lock;
- impede segundo estorno pela unicidade de estorno_de_evento_id;
- cria evento Estorno com os valores do original;
- reabre a obrigação para Pendente na mesma transação;
- nunca apaga ou altera o evento original.

## RLS e privilégios

SELECT e INSERT exigem simultaneamente authenticated, proprietario_id = auth.uid(), autor_id = auth.uid() no INSERT e vínculo em public.usuarios com o mesmo empresa_id.

anon e PUBLIC não recebem privilégios de aplicação. authenticated recebe apenas SELECT/INSERT na tabela e EXECUTE nas duas RPCs.

Como as RPCs são SECURITY INVOKER, authenticated precisa do INSERT usado internamente. Um INSERT direto é tecnicamente possível quando todas as constraints e a RLS são satisfeitas. O front-end deve usar exclusivamente as RPCs. Uma camada ainda mais fechada exigiria desenho separado, sem trocar silenciosamente para SECURITY DEFINER.

## Despesas futuras

Esta migration não cria Despesa Pessoal e não altera public.despesas. A integração futura deve adicionar vínculo único ao evento em proposta separada, criar a Despesa pelo valor_pago, ser idempotente/transacional e compensar estorno sem apagar histórico.

## Ordem operacional futura

1. Executar 01_preflight_readonly.sql.
2. Comparar os guards e guardar o fingerprint.
3. Com nova autorização, executar somente 02_estrutura_rpcs_proposta.sql.
4. Executar imediatamente 03_validacao_readonly.sql.
5. Confirmar zero eventos e fingerprint idêntico.
6. Em autorização posterior, integrar o front-end.
7. Tratar Entrada e Despesa em propostas separadas.

## Rollback

04_rollback_fail_closed.sql só executa quando existem zero eventos. Após o primeiro evento, remover a tabela apagaria histórico financeiro e o rollback abortará. A partir daí, qualquer correção deve ser roll-forward.

## Riscos restantes

- Sem backfill dos 21 pagamentos históricos.
- Entrada ainda depende de tabela/RPC própria.
- Integração com despesas ainda depende de proposta separada.
- Testes de concorrência/RLS devem usar dados descartáveis autorizados, nunca as obrigações reais de Mauro.
