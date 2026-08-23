# Entrada retroativa — MOTO CBR 300

Status: **proposta local completa e apta para futura execução controlada; nada executado**.

Auditoria readonly de 16/08/2026:

- grupo `0fcb172c-524c-4499-b93a-5d8d68203165`;
- 24 parcelas de R$ 1.308,00, total R$ 31.392,00; 5 pagas, 19 pendentes;
- fingerprint físico: `1f36adcebcc65603adc286d1e2636ed4`;
- único tenant/proprietário: `8a85591b-2410-405f-8279-910dbcf61011`, Auth/usuarios de Mauro;
- zero `entrada_id`, zero cabeçalho de entrada, zero evento Entrada;
- integração Eventos → Despesas ainda ausente remotamente;
- metadados: MOTO CBR 300, BANCO PAN, VEÍCULO, versão 3;
- a observação `DEI DE ENTRADA 8.750,00` é evidência auxiliar, não guard de autoria/data.
- data real confirmada pelo usuário: **27/04/2026**. A RPC rejeita qualquer outra data.

A RPC proposta cria transacionalmente um cabeçalho de R$ 40.142,00 (entrada R$ 8.750,00 + saldo R$ 31.392,00), vincula somente `entrada_id` nas 24 parcelas e cria um evento append-only Entrada. Não recalcula nem altera valor, vencimento, status, numeração ou grupo. O trigger existente atualizará `atualizado_em` ao vincular `entrada_id`; isso é metadado técnico esperado.

Não há Despesa retroativa nesta operação: a integração ainda não existe. A RPC abortará se essa integração surgir antes da execução, exigindo revisão específica para materialização idempotente da Despesa em 27/04/2026. Após execução futura, desfazer por DELETE seria perda de auditoria; eventual correção deve usar roll-forward/estorno dedicado.

Ordem futura: preflight → autorização explícita → criar RPC → executar a chamada única de `03_execucao_controlada_proposta.sql` em sessão autenticada de Mauro → validação. A idempotency key aprovada na proposta é `52e20038-b0fc-4465-8727-cb1a48072c37`. Nenhum arquivo desta pasta foi executado.
