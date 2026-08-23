# Contas a Pagar Pessoais — histórico completo de Mauro

Proposta local não executada. Substitui e cancela a versão limitada aos quatro legados.

- Copiar os 18 registros do tenant atual como canônicos.
- Copiar a CPFL legada `fd37b52a-69a1-4ad3-91c5-514b88c1a49c` separadamente.
- Ignorar Claro `c17314e1...`, Riachuelo `f9aa8622...` e Planeta `40091009...`: seus pares atuais têm mesmo valor/vencimento e status atualizado.
- Resultado: 19 obrigações; 15 pagas (R$ 7.893,16), 4 pendentes (R$ 2.289,57), total R$ 10.182,73.
- Preservar os 22 registros físicos de origem.

## UUIDs copiados

`4c282335-9aa7-4df6-9390-dd90cb99e8a9`, `5921f97c-81cd-41ec-a347-3ab3e3c511d3`, `13bc39b3-b896-482c-b509-802f05cfc22c`, `09dd7fb9-de2a-4e59-ab0d-b2bbbffded55`, `7a1322c4-8a56-4455-b4c0-49fd146687b6`, `c543fd6c-4bbf-47fe-bb5d-2df53d142e3f`, `a8fbb7c2-eb36-468c-b956-b967de0860d1`, `f051f708-0bfc-4095-98a2-1f0351c915bf`, `f92a96d6-e7e0-4f04-bf28-92ddb5c8607e`, `322d87dc-e29f-44a8-bce2-7e2d7a95261d`, `c196fc9f-1c52-4a07-8260-6c6747cc7e59`, `ffea9470-595f-41e2-a9de-1952bb781675`, `f2fcab52-9273-4412-89e5-708b101a932e`, `ade49092-a552-4ba5-b2f9-856eea1ec1ae`, `b0ed2fef-bd18-4598-b466-786e16684589`, `35b8f3f5-9f15-4d45-a292-3f66d09b70be`, `6cd10fef-c4f5-46a8-a2be-abdb76d65617`, `83fef1f9-39df-4c8f-b2e0-f1aef0536930` e a CPFL `fd37b52a-69a1-4ad3-91c5-514b88c1a49c`.

`source_legacy_id` rastreia toda cópia. A migration da tabela propõe também unicidade lógica por empresa, proprietário, fornecedor/descrição normalizados, valor e vencimento.

Ordem futura: preflight somente leitura, aprovação da tabela, nova autorização da migração e validação pós-aplicação. Nada desta pasta foi executado.
