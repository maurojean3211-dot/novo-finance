# Proposta B — Hardening de `public.contas_fixas`

Status: **somente proposta local; não executar**.

O estado auditado possui RLS desabilitada em `public.contas_fixas`. A tabela não contém `proprietario_id`; portanto, a proteção possível sem evoluir o schema é por tenant, vinculando `auth.uid()` a `usuarios.empresa_id`.

Impacto esperado: usuários autenticados passam a ler e alterar somente contas fixas da própria empresa. A aplicação depende de `usuarios.id = auth.uid()` e de `usuarios.empresa_id` corretamente preenchido. Contas pessoais distintas dentro da mesma empresa ainda não ficam isoladas por proprietário; isso exigiria uma evolução separada de schema.

Pré-condição adicional: o saneamento isolado do ID 5 deve ter sido aplicado e validado. O ID 3 permanece deliberadamente no tenant legado inexistente como duplicidade lógica preservada do ID 7. Ele será o único órfão permitido pelos guards e ficará invisível ao CRUD normal depois da RLS.

Arquivos:

- `01_preflight_readonly.sql`: inventário e guards;
- `02_hardening_proposta.sql`: RLS e policies propostas;
- `03_validacao_readonly.sql`: metadados e teste por sessão;
- `04_rollback_proposta.sql`: restaura explicitamente o estado anterior inseguro, somente para contingência autorizada.

Nenhum SQL desta pasta foi executado.
