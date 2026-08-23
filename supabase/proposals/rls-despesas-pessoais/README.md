# Proposta local — hardening de RLS de `public.despesas`

Esta proposta foi preparada sem executar DDL, DML ou alteração remota de RLS.

## Diagnóstico confirmado por consultas somente leitura

- RLS está habilitada, sem `FORCE ROW LEVEL SECURITY`.
- Existem cinco policies. Duas delas (`liberar tudo despesas` e `liberar delete despesas`) permitem acesso amplo a qualquer usuário autenticado e anulam a segregação por tenant.
- `anon` e `authenticated` possuem privilégios de tabela excessivos, inclusive `TRUNCATE`, `TRIGGER` e `REFERENCES`.
- Há quatro registros, todos no tenant atual de Mauro (`8a85591b-2410-405f-8279-910dbcf61011`): três receitas, total de R$ 6.808,00, e uma despesa de R$ 135,80.
- Não há registros de Karla e não há `empresa_id` nulo ou apontando para empresa inexistente.
- Os quatro registros têm `user_id` nulo. Por isso, endurecer a policy com `despesas.user_id = auth.uid()` ocultaria dados reais já existentes e quebraria as telas atuais, que gravam `empresa_id`, mas não `user_id`.

## Estratégia

As quatro operações são limitadas a usuários autenticados cuja linha em `public.usuarios` tenha o mesmo `empresa_id` da despesa. A proposta preserva o modelo atual do front-end e exige simultaneamente autenticação e associação ao tenant.

Ela não altera registros, não preenche `user_id`, não adiciona colunas e não cria vínculo com eventos de pagamento. O script de execução é transacional e possui guards fail-closed para o estado auditado.

## Arquivos

- `01_preflight_readonly.sql`: diagnóstico e guards somente leitura.
- `02_hardening_proposta.sql`: proposta transacional, não executada.
- `03_validacao_readonly.sql`: validação posterior somente leitura.
- `04_rollback_proposto.sql`: restaura o estado anterior; deve ser usado apenas em emergência, pois restaura policies e grants inseguros.

## Impacto esperado

- Mauro continua vendo as quatro linhas do próprio tenant nas páginas de Receitas, Despesas e Relatórios.
- Uma conta associada a outro tenant não vê nem modifica essas linhas.
- Nenhum dado é reatribuído, removido ou reescrito.
- A integração futura de pagamento com `despesas` deve ser tratada separadamente, depois deste hardening.

## Riscos e pré-condições

- A associação em `public.usuarios` precisa existir e apontar para o `empresa_id` correto antes da execução.
- O script aborta se policies, grants, quantidade de linhas ou integridade de tenant divergirem do estado auditado.
- O rollback restaura deliberadamente o estado permissivo anterior e não deve ser considerado uma configuração segura permanente.
