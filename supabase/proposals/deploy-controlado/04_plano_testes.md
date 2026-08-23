# Testes controlados

Usar fixtures identificadas e não destrutivas. Capturar status, tenant, resultado limitado e audit log.

## Flags

| Estado | Provisionamento | Administração |
|---|---|---|
| OFF | até RPC validada e durante RLS inicial | até Edge+audit validados |
| TEST | segmento descartável | somente Mauro controlado |
| ON | após signup/idempotência/cross-tenant | após matriz completa/auditoria |

## Mauro

1. Login, próprio perfil e tenant Mauro.
2. Clientes, contas fixas e recebimentos legítimos; nenhuma linha Karla.
3. Confirmar IDs 3/5 saneados.
4. Não reprovisionar Mauro; RPC somente em fixture segura.
5. `LIST_USERS` target Mauro: sucesso allowlisted e auditado.
6. Sem target: 400. Target Karla: permitido somente pelo `master_admin=true`, target explícito e auditoria correta.
7. Não convidar email real nem atualizar perfil master.

## Karla

1. Login, próprio perfil e somente tenant Karla.
2. IDs Mauro em SELECT/UPDATE/DELETE: zero/negação, sem mudança.
3. Edge target Mauro: 403. Target Karla somente se houver papel tenant-admin formal; caso contrário 403.
4. Zero administração global e nenhuma alteração de `master_admin`.

## Usuário comum descartável

1. Signup; sem sessão, aguardar confirmação e não provisionar.
2. Confirmar email, login, RPC; validar perfil/empresa comuns.
3. Repetir RPC: idempotente, sem duplicidade.
4. Tentativas de enviar `user_id`, `empresa_id`, role/master, cross-tenant e Edge: rejeitadas/zero, sem alteração.
5. Limpeza do fixture somente em change posterior aprovado; não improvisar DELETE.

Qualquer linha de outro tenant, operação sem target, privilégio, falta de auditoria, duplicidade ou quebra legítima é STOP imediato.

