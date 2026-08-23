# Integração Eventos de Pagamento/Entrada → Despesas Pessoais

Status: **proposta local revisada; não executada remotamente**.

## Estado remoto aceito pelos guards

- `despesas`: 11 registros, sendo 8 receitas (R$ 14.396,00) e 3 despesas (R$ 1.585,80).
- `contas_pagar_pessoais`: 43 obrigações, 21 pagas, 22 pendentes e R$ 41.574,73 nominais.
- Existem exatamente um cabeçalho e um evento `Entrada`, ambos da entrada retroativa de R$ 8.750,00 da MOTO CBR 300 em 27/04/2026.
- O grupo da moto mantém 24 parcelas, R$ 31.392,00, sendo 5 pagas e 19 pendentes.
- Não existem eventos `Pagamento`, `Antecipacao` ou `Estorno`; portanto, os 21 status históricos pagos não serão convertidos nem receberão backfill automático.
- Ainda não existe despesa de R$ 8.750,00 correspondente à entrada da moto.

O preflight e a migration comparam contagens, totais, fingerprints, UUIDs, tenant, proprietário, evento, cabeçalho, parcelas, RLS, policies, assinaturas, definições e privilégios das RPCs. Qualquer evento, entrada ou mudança inesperada aborta a operação.

## Decisão de arquitetura

Cada evento elegível (`Pagamento`, `Antecipacao` ou `Entrada`) passa a ter no máximo uma despesa por meio de `despesas.pagamento_evento_id`, com FK composta por evento, empresa e proprietário e unicidade física. As RPCs permanecem `SECURITY INVOKER`, com `search_path` vazio, autenticação, tenant e proprietário validados.

Um trigger de integridade valida valor, data, tipo, tenant e proprietário; impede converter uma despesa manual em integrada por `UPDATE`, torna campos financeiros rastreáveis imutáveis e bloqueia `DELETE` de lançamentos integrados. Estorno preserva o histórico, marca a despesa como inativa e mantém os vínculos.

## Entrada retroativa já existente

A migration estrutural **não chama nenhuma RPC e não cria a despesa da moto**. Ela apenas instala a RPC dedicada:

`materializar_despesa_evento_entrada_pessoal(evento_id, empresa_id, proprietario_id)`

Essa RPC usa o ID do evento como chave natural 1:1, adquire um advisory lock transacional derivado desse UUID, compara o evento ao cabeçalho e retorna a despesa existente somente se todos os campos coincidirem. Caso contrário, insere exatamente uma despesa. A unicidade de `pagamento_evento_id` também protege duas sessões concorrentes. O advisory lock evita exigir `UPDATE` na tabela append-only de eventos.

A materialização dos R$ 8.750,00 exige uma autorização posterior e separada. Ela não ocorre na aplicação da migration nem na validação readonly.

## Novos pagamentos e entradas

- Pagamento normal: despesa pelo valor efetivamente pago, igual ao nominal.
- Antecipação: despesa pelo valor efetivamente pago; desconto permanece no evento.
- Nova entrada criada após a integração: evento e despesa são criados na mesma transação.
- Estorno: cria evento append-only, mantém a despesa e a marca como inativa; não usa `DELETE`.

## Compatibilidade histórica e RLS

As cinco colunas novas de integração permanecem `NULL` nos 11 registros históricos. As quatro policies `despesas_*_tenant` continuam exigindo `usuarios.id = auth.uid()` e `usuarios.empresa_id = despesas.empresa_id`; para registros integrados, também exigem `proprietario_id = auth.uid()`. Registros manuais históricos, cujo proprietário é desconhecido, continuam com `proprietario_id NULL` e mantêm o comportamento atual por tenant.

Nenhuma policy de eventos ou entradas é alterada. `anon` e `PUBLIC` não recebem execução das RPCs; somente `authenticated` recebe o privilégio explícito.

## Ordem futura controlada

1. Executar `01_preflight_readonly.sql`.
2. Com nova autorização, executar somente `02_migration_rpc_proposta.sql`.
3. Executar imediatamente `03_validacao_readonly.sql`.
4. Não chamar RPCs com dados reais como teste da migration.
5. Em autorização separada, materializar idempotentemente a despesa da entrada da moto.

## Rollback

O rollback é fail-closed. Como já existe evento/cabeçalho da entrada, a remoção automática da estrutura não é considerada segura; após uma eventual aplicação, qualquer correção deverá ser roll-forward e preservar rastreabilidade.

Classificação local pretendida após preflight: **APTA PARA MIGRATION CONTROLADA DA INTEGRAÇÃO EVENTOS → DESPESAS**.
