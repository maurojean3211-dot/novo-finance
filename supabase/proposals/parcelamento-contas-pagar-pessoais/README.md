# Parcelamento de Contas a Pagar Pessoais — proposta local

Status: **NÃO EXECUTADA**. Este pacote não altera o Supabase remoto nem ativa o front-end.

## Diagnóstico

`public.contas_pagar_pessoais` armazena obrigações independentes. Não existem campos para identificar uma compra, ordenar parcelas, registrar o total contratado ou tornar a criação em lote idempotente. Criar várias linhas diretamente pelo navegador permitiria lote parcial e duplicação por requisição repetida.

Estado remoto observado em 15/08/2026: 19 registros, 16 `Pago`, 3 `Pendente`, nenhum `Cancelada`, total R$ 10.182,73 e 19 `source_legacy_id` distintos. Os campos novos serão nulos para o histórico e não o reclassificarão.

## Estrutura proposta

- `grupo_parcelamento_id uuid`: referência comum imutável da compra;
- `parcela_numero integer` e `parcelas_total integer`;
- `valor_total_compra numeric(14,2)`;
- `periodicidade text`, inicialmente somente `Mensal`;
- `idempotency_key uuid`: chave da confirmação, única por proprietário/tenant/parcela;
- constraints all-or-none e limite de 2 a 120 parcelas;
- unicidade de grupo/parcela e chave idempotente/parcela;
- RPC `criar_parcelamento_conta_pessoal`, transacional, `SECURITY INVOKER`, tenant-aware e serializada pela chave idempotente.

A RPC calcula em centavos. Sem primeira parcela especial, divide igualmente e ajusta a última. Com primeira parcela informada, preserva seu valor e divide exatamente o saldo, ajustando apenas a última. Vencimentos mensais preservam o dia quando possível e usam o último dia em meses mais curtos.

## Impacto futuro no front-end

Arquivos previstos, não alterados nesta etapa:

- `PersonalPayableModal.jsx`: alternância Único/Parcelado e novos campos;
- `personalFinance.service.js`: gerar a chave uma vez por confirmação e chamar somente a RPC;
- `ContasPagarPessoaisPage.jsx`: exibir parcela/total, grupo e saldo restante;
- `usePersonalFinanceRead.js`: incluir campos caso a leitura deixe de usar `*`;
- `RelatoriosPessoaisPage.jsx`: contabilizar cada parcela por seu valor/vencimento e agregar por grupo.

Pagamentos permanecem individuais. A integração Conta a Pagar → Despesa deverá usar o ID da parcela, nunca o valor total. Edição/cancelamento em lote requer RPC separada e confirmação; parcelas pagas não podem ser alteradas silenciosamente.

## Ordem futura

1. Revisar `01_preflight_readonly.sql`.
2. Com autorização própria, executar `02_migration_proposta.sql`.
3. Executar `03_validacao_readonly.sql`.
4. Somente depois ativar o front-end.

## Riscos restantes

- O limite de 120 parcelas precisa de confirmação antes da execução.
- Edição/cancelamento em lote ainda exige desenho transacional separado.
- Pagamento → Despesa continua em proposta separada.
- O alerta de RLS de outras tabelas, inclusive `contas_fixas`, está fora deste pacote.
- O rollback aborta se qualquer parcelamento já tiver sido criado.

