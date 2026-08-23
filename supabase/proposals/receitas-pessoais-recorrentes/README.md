# Receitas Pessoais Recorrentes e Competências Mensais

Status: **migration controlada local preparada; nada executado remotamente**.

## Estado protegido

- `public.despesas`: 11 registros, dos quais 8 receitas únicas totalizam R$ 14.396,00.
- As oito receitas permanecem intactas, sem backfill, conversão, vínculo ou reclassificação.
- As quatro policies `despesas_*_tenant` permanecem fora do escopo desta migration.
- A migration aborta se contagens, fingerprints, identidade `usuarios.id/empresa_id`, policies ou ausência dos novos objetos divergirem.

## Objetos propostos

1. `receitas_pessoais_recorrencias`: cabeçalho mensal, valor/dia padrão, período, ativo, versão e idempotência.
2. `receitas_pessoais_competencias`: ocorrência física de um mês; unicidade `(recorrencia_id, competencia)`.
3. `receitas_pessoais_competencia_eventos`: trilha append-only de `Recebimento`, `Cancelamento` e `Reabertura`.

Todas usam chave composta de escopo, FKs restritivas, índices de tenant/proprietário e RLS. `anon` e `PUBLIC` não têm CRUD nem execução das RPCs. `authenticated` recebe apenas CRUD compatível com as policies; não há DELETE em tabelas ou policies. As RPCs são `SECURITY INVOKER`, `search_path = ''` e usam nomes qualificados.

## RPCs e regras

- `criar_receita_recorrente_pessoal`: cria só o cabeçalho; não gera meses.
- `atualizar_receita_recorrente_pessoal`: lock e versão otimista; altera apenas o cabeçalho. Competências já materializadas não são regravadas.
- `materializar_competencia_receita_pessoal`: cria explicitamente um único mês, respeita série ativa/período e ajusta dias 29/30/31 ao último dia do mês.
- `editar_competencia_receita_pessoal`: altera somente valor, data prevista e observação de uma ocorrência `Prevista`, mantendo o mês.
- `registrar_recebimento_receita_pessoal`: evento + mudança da ocorrência para `Recebida` na mesma transação.
- `cancelar_competencia_receita_pessoal`: cancela somente uma ocorrência `Prevista`, sem apagar histórico.
- `reabrir_competencia_receita_pessoal`: reabre somente uma ocorrência `Cancelada`; não estorna recebimento.

Locks de linha, chaves de idempotência e a unicidade mensal impedem duplicação por duplo clique ou sessões concorrentes. Frequência inicial é exclusivamente `Mensal`. Não há cron, geração infinita ou materialização automática.

## Relatórios futuros

- Receita prevista do mês: competências `Prevista` e `Recebida`, por `valor_previsto`.
- Receita recorrente realizada: competências `Recebida`, por `valor_recebido`.
- Receita única realizada: `despesas.tipo = 'receita'`, pelo mês de `data_lancamento`.
- Canceladas não entram em previsto nem realizado.
- Saldo previsto: receitas previstas menos despesas/obrigações previstas do mesmo mês.
- Saldo realizado: receitas únicas + recorrentes recebidas menos despesas realizadas ativas.

O front-end deverá consultar simultaneamente `empresa_id` e `proprietario_id`; essa adaptação não faz parte desta etapa.

## Ordem operacional futura

1. Executar `01_preflight_readonly.sql`; todos os guards `*_ok` devem ser verdadeiros.
2. Revisar o resultado e obter autorização explícita.
3. Executar somente `02_schema_rpc_proposta.sql`.
4. Executar imediatamente `03_validacao_readonly.sql`.
5. Não gerar competências reais até autorização funcional separada.

## Rollback

`04_rollback_fail_closed.sql` remove exatamente as sete RPCs e as três tabelas na ordem de dependência. Ele aborta se faltar objeto, houver RPC/policy inesperada ou existir qualquer linha. Depois do primeiro uso, rollback destrutivo é proibido; a correção deve ser roll-forward para preservar a trilha financeira.

## Impactos e limites

- Nenhuma alteração em `public.despesas`, nas oito receitas existentes ou nas policies atuais.
- Alterações do cabeçalho só influenciam competências futuras ainda não materializadas.
- Recebida não pode ser reaberta nesta versão: exige proposta separada de estorno auditável.
- Não há propagação em massa, geração histórica, cron ou periodicidade diferente de mensal.
- Relatórios, Visão Geral e telas permanecem para etapa posterior.
