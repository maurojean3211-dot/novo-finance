# Plano integrado RLS + backend — não executar

## Dependências críticas

- `provisionar_conta_v1` deve existir e estar testada antes de retirar INSERT direto.
- O frontend deve usar a RPC sem fallback antes do endurecimento de `usuarios`.
- `empresas` e `usuarios` devem ser endurecidas na mesma transação futura.
- A Edge Function e a auditoria devem existir antes de reativar MasterAdmin.
- `service_role`/secret key permanece somente servidor.

## Matriz administrativa

| Operação | Comum | Admin tenant | Mauro `master_admin=true` |
|---|---|---|---|
| LIST_USERS | negado | próprio target | qualquer target existente e explícito |
| INVITE_USER | negado | próprio target | qualquer target existente e explícito |
| UPDATE_PERMISSIONS | negado | próprio target, alvo não admin | qualquer target explícito, alvo não admin |
| DISABLE_USER | fora da v1 | fora da v1 | fora da v1 |
| alterar master_admin/role/tenant | negado | negado | fora da API v1 |

## Testes mínimos

- Mauro: login/perfil/tenant; dados próprios; global somente com target; auditoria de cada ação.
- Karla: perfil/dados próprios; zero leitura Mauro; sem administração global.
- Comum: próprio perfil; zero promoção, administração ou cross-tenant.
- Cadastro: confirmação, login, RPC, repetição idempotente e payload sem campos privilegiados.
- Admin tenant: somente própria empresa.
- Anon: zero CRUD nas tabelas protegidas e zero EXECUTE privilegiado.

## Gate

Os artefatos locais satisfazem o gate para iniciar teste controlado autorizado. Durante o teste, qualquer divergência de preflight, Edge/auditoria indisponível, frontend direto ou teste falho produz NO-GO para produção.
