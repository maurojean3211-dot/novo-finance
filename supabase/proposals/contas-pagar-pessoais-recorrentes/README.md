# Contas a Pagar Pessoais Recorrentes

Status: **migration/RPCs locais promovidas para futura execução controlada; nada executado remotamente**.

## Estado auditado em 16/08/2026

- `contas_pagar_pessoais`: 43 obrigações, 21 pagas, 22 pendentes, R$ 41.574,73.
- Um grupo de compra parcelada com 24 parcelas; nenhuma recorrência.
- Eventos de pagamento existe e está vazio. RPCs de pagamento/estorno são `SECURITY INVOKER`.
- A integração Eventos → `despesas` ainda não está ativa no remoto.
- `contas_fixas`: 8 linhas; Mauro tem 6 ativas, R$ 3.608,53.

## Arquitetura

Não reutilizar `grupo_parcelamento_id`: parcelamento divide um total; recorrência cria obrigações mensais autônomas e variáveis. Criar `contas_pagar_pessoais_recorrencias` e adicionar à obrigação física `recorrencia_id`, `competencia` (primeiro dia do mês) e `valor_previsto` (snapshot).

`valor` será o nominal vigente da competência e poderá ser ajustado antes do pagamento sem mudar `valor_previsto` ou outros meses. O evento existente preservará nominal, efetivamente pago e desconto.

Modos mutuamente exclusivos:

- único: sem grupo, entrada ou recorrência;
- parcelado: grupo e campos de parcela;
- entrada + parcelamento: grupo e `entrada_id`;
- recorrente: recorrência/competência/valor previsto, sem grupo ou entrada.

Uma unique key por tenant/proprietário/recorrência/mês impede duplicação. A materialização usa essa chave natural e lock do cabeçalho como idempotência, sem reutilizar a `idempotency_key` reservada pela constraint de parcelamento. Criação e materialização são explícitas, mensais, finitas (1–120), sem cron. Editar/cancelar afeta só uma competência; atualizar o padrão afeta apenas meses ainda não materializados; encerrar impede novas materializações e preserva as existentes.

RPCs promovidas: `criar_recorrencia_conta_pessoal`, `materializar_competencia_conta_pessoal`, `atualizar_recorrencia_conta_pessoal`, `ajustar_competencia_recorrente_pessoal`, `cancelar_competencia_recorrente_pessoal` e `encerrar_recorrencia_conta_pessoal`. Todas são `SECURITY INVOKER`, usam `search_path = ''`, objetos qualificados, tenant/proprietário e execução somente por `authenticated`.

Pagamento usa as RPCs de eventos atuais. Despesa automática só poderá ocorrer depois da integração Eventos → Despesas ser aplicada e validada separadamente.

## Relatórios

- previsto mensal: recorrências não canceladas por `valor_previsto`;
- obrigação atual: por `valor`;
- realizado: eventos não estornados por `valor_pago`, ou futuramente despesas integradas ativas, nunca ambos;
- contas únicas e parceladas continuam na mesma tabela, sem dupla contagem.

## Seis contas fixas de Mauro

| ID | Descrição | Valor | Dia |
|---:|---|---:|---:|
| 5 | ODONTOCOMPANY | R$ 49,90 | 10 |
| 6 | claro movel | R$ 55,06 | 22 |
| 7 | aluguel apartamento | R$ 1.947,64 | 11 |
| 8 | claro fixo e movel | R$ 119,00 | 10 |
| 9 | CPFL | R$ 128,93 | 23 |
| 10 | financimento moto CB300 | R$ 1.308,00 | 27 |

Não migrar automaticamente: faltam proprietário, início, quantidade de meses, fornecedor e categoria. Uma futura proposta de dados deverá usar os seis IDs explícitos e `source_conta_fixa_id` único, sem alterar `contas_fixas`. O ID 10 exige deduplicação adicional porque já existe um grupo parcelado da moto.

Foto/PDF futuro deverá localizar tenant/proprietário + série + competência e apenas sugerir valor/vencimento após confirmação.

Ordem futura: preflight → autorização explícita → schema/RPCs → validação readonly → migração separada dos seis IDs → front-end. Rollback estrutural só será seguro antes do primeiro uso; depois, apenas roll-forward.
