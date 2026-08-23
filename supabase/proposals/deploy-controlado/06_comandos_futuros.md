# Comandos futuros — NÃO EXECUTAR AGORA

Confirmar todos com `--help` na versão instalada. Resolver placeholders sem gravar segredo no history/repositório.

## READ-ONLY

```powershell
git status --short
git diff --check
npx.cmd supabase --version
npx.cmd supabase migration list --linked
npx.cmd supabase db dump --linked --schema public --file <BACKUP_PROTEGIDO>
psql <DATABASE_URL_CONTROLADA> -v ON_ERROR_STOP=1 -f <PREFLIGHT_READONLY>
```

Pré-condição: project ref conferido por duas pessoas e sessão SQL read-only. Risco: projeto/credencial errados e dump sensível. Checkpoint: saída, checksum e restore. Abortagem: divergência, erro ou arquivo vazio.

## WRITE LOCAL

```powershell
Copy-Item -Recurse supabase/proposals/backend-seguro-auth-admin/edge-function/admin-users-v1 supabase/functions/admin-users-v1
npm.cmd run build
npx.cmd eslint src/Login.jsx src/Cadastro.jsx src/MasterAdmin.jsx src/PainelSistema.jsx src/Emprestimos.jsx src/services/secureAuth.service.js src/services/adminUsers.service.js
```

Pré-condição: worktree dedicado. Risco: misturar estado antigo. Checkpoint: diff somente candidato. Abortagem: arquivo estranho/secret.

## WRITE REMOTO

Não usar `db push` nos arquivos de proposal. Em tarefa autorizada, criar migrations oficiais via CLI ou usar canal SQL controlado:

```powershell
psql <DATABASE_URL_CONTROLADA> -v ON_ERROR_STOP=1 -f <ARQUIVO_APROVADO>
```

Para Fase 1, `<ARQUIVO_APROVADO>` deve ser o `02_migration_proposta.sql` de `saneamento-legado-mauro-contas-fixas`. Para Fase 2, deve ser o arquivo correspondente de `saneamento-legado-mauro-contas-pagar`. Executar separadamente: audit log; RPC+grants; saneamento de contas fixas; RLS atômica; e, em outra janela, saneamento de contas a pagar. Pré-condição: backup, preflight e aprovação. Risco: escrita/schema/RLS. Checkpoint: validação nominal imediata. Abortagem: row count, policy, grant, owner ou teste divergente. Nunca encadear etapas ou executar os dois saneamentos automaticamente em conjunto.

## DEPLOY

```powershell
npx.cmd supabase functions deploy admin-users-v1 --project-ref <PROJECT_REF>
```

Pré-condição: audit log, hash aprovado, segredo servidor e flags OFF. Risco: endpoint privilegiado. Checkpoint: JWT inválido=401, comum=403, target ausente=400, auditoria. Abortagem: resposta permissiva/log ausente/secret exposto.

## TEST

```powershell
npx.cmd supabase functions serve admin-users-v1
npm.cmd run build
git diff --check
```

Chamadas remotas usam runner autenticado, nunca token literal. `LIST_USERS` também escreve auditoria e convite envia email. Abortagem: cross-tenant, dado excessivo, duplicidade ou falha de auditoria.

Proibidos: `db reset`, `migration repair`, `db push`, rollback amplo, policy aberta, grant amplo ou flags no mesmo passo do backend.
