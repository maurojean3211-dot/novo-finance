# Proposal local — backend seguro para Auth e MasterAdmin

## Estado

Proposal exclusivamente local e não executada, integrada com `../rls-multiempresa/`. Ela resolve localmente provisionamento após confirmação de email e administração sem acesso global direto do navegador. Estado integrado: **A — PRONTA PARA TESTE CONTROLADO**.

## Arquitetura escolhida: combinação PostgreSQL + Edge Function

O autoprovimento usa uma RPC PostgreSQL `SECURITY DEFINER`, pois empresa e perfil precisam ser gravados na mesma transação. MasterAdmin usa Edge Function autenticada porque convite/criação em Supabase Auth exige Auth Admin API e segredo exclusivamente servidor.

Não se escolheu RPC SQL para administrar `auth.users`, nem Edge Function para o autoprovimento transacional simples. O frontend nunca recebe `service_role`/secret key.

## Fluxo de provisionamento

Após confirmação de email e login, o frontend futuramente chamará `provisionar_conta_v1(nome,cpf,whatsapp)`. A função:

1. exige `auth.uid()` e email no JWT;
2. recebe nenhum `user_id`, `empresa_id`, role ou privilégio;
3. serializa concorrência pelo próprio UID;
4. se perfil e empresa coerentes já existem, retorna `existente`;
5. se há empresa única criada anteriormente pelo mesmo UID, conclui o perfil;
6. se não há empresa, cria empresa com `user_id=auth.uid()`;
7. cria perfil seguro, comum e sem permissões;
8. falha integralmente diante de duplicidade ou vínculo inconsistente.

Uma função PostgreSQL executa atomicamente: se o perfil falhar, a empresa criada na mesma chamada também é revertida. Chamadas repetidas são idempotentes.

Quando `signUp` não devolve sessão, nenhuma RPC é chamada. O usuário confirma o email, autentica e só então provisiona. Os dados de empresa não são usados como autorização; podem ser solicitados novamente ou guardados apenas como rascunho local até o login.

## Segurança da RPC

- `SECURITY DEFINER` apenas porque precisa atravessar RLS para criar as duas linhas.
- `search_path=''` e objetos qualificados por schema.
- identidade exclusivamente de `auth.uid()`/JWT validado.
- advisory lock transacional por UID.
- nenhum SQL dinâmico.
- `REVOKE` de `PUBLIC`, `anon` e `authenticated`, seguido de `GRANT EXECUTE` somente a `authenticated`.
- nenhum parâmetro capaz de escolher tenant ou privilégio.
- comportamento fail-closed em inconsistência.

Na aplicação futura, a validação deve confirmar nominalmente o owner da função e seus privilégios efetivos de SELECT/INSERT em `empresas` e `usuarios`. O `SECURITY DEFINER` não concede privilégio por si só; ele executa com os privilégios do owner. A revogação de `authenticated` não deve afetar esse owner.

## MasterAdmin

O contrato `admin-users-v1` está em `06_edge_function_contract.md`. A Edge Function valida o JWT e depois o perfil do chamador no servidor antes de usar cliente privilegiado.

Regra explícita:

- `master_admin=true`: escopo global, mas sempre com tenant alvo explícito;
- `role='master'` e `master_admin=false`: somente o próprio tenant;
- demais usuários: sem acesso administrativo.

Decisão formal: Mauro CUNHA, empresa `8a85591b-2410-405f-8279-910dbcf61011`, é o MasterAdmin global esperado. O preflight deve identificar univocamente seu perfil antes de qualquer alteração futura. Karla, empresa `3c5ce0fd-20a9-455f-8279-910dbcf61011`, permanece isolada. A API v1 nunca cria, promove ou revoga outro master global.

V1 permite `LIST_USERS`, `INVITE_USER` e `UPDATE_PERMISSIONS`. Mudança de tenant, promoção, exclusão, `DISABLE_USER`, criação/revogação de master global e revogação de sessão permanecem bloqueadas.

## Modelo real considerado

`public.usuarios` tem 25 colunas reais, incluindo `id`, `empresa_id`, `role`, `tipo_usuario`, `nivel`, `master_admin`, `permissoes`, flags `pode_*`, flags funcionais, `isento`, `email`, `pix`, `pix_chave`, `cpf` e `whatsapp`; `is_admin` não existe.

`public.empresas` é usado conforme o fluxo local confirmado: `id`, `user_id`, `name`, `email`, `cpf`, `whatsapp`, `plano` e `status`. O preflight exige essas colunas antes de qualquer consideração de aplicação.

## Relação com a proposal RLS

Esta proposal substitui conceitualmente o INSERT direto de empresa/perfil e fornece o caminho futuro do MasterAdmin. Antes de integrar:

1. INSERT/grant direto em `usuarios` deve ser removido em favor da RPC;
2. grants da RPC e grants/RLS das tabelas devem entrar na mesma mudança revisada;
3. o guard de `usuarios` deve permitir somente a execução privilegiada esperada, sem liberar o frontend;
4. `empresas` precisa entrar na Fase 1, na mesma transação de `usuarios`, sem impedir a função;
5. testes das duas proposals devem ser executados juntos em ambiente controlado.

As integrações locais foram preparadas por feature flags, sem fallback inseguro: cadastro chama apenas a RPC proposta e administração chama apenas a Edge proposta quando explicitamente habilitadas. Nenhum objeto remoto foi criado ou ativado.

## Pendências antes de aplicação

1. Revisar formalmente a implementação local da Edge Function e `admin_audit_log`, sem deploy.
2. Definir desativação/revogação antes de oferecer `DISABLE_USER`.
3. Executar testes controlados Mauro, Karla, comum e cross-tenant em ambiente autorizado.

## Ordem futura integrada

1. Preflight completo, incluindo policies de `empresas`, perfil Mauro e inconsistências.
2. Implementar/revisar trilha e Edge Function; disponibilizá-las somente em aplicação autorizada.
3. Criar `provisionar_conta_v1` e grants restritos.
4. Migrar frontend para RPC/Edge e validar sem retirar ainda o caminho antigo.
5. Em uma transação, endurecer `empresas+usuarios`, remover INSERT direto e ativar somente o novo caminho.
6. Endurecer clientes.
7. Sanear 2 contas_fixas Mauro e então endurecer contas_fixas.
8. Endurecer recebimentos; empréstimos somente após condição funcional.
9. Executar bateria controlada completa.
10. Sanear 4 contas_pagar Mauro antes de endurecer contas_pagar na Fase 2; grupo 8b15 intocado.

Não pode existir janela com frontend antigo bloqueado, RLS sem policy, policy permissiva residual ou segredo no cliente.

## GO / NO-GO

GO somente com preflight 100%, zero policies abertas, grants mínimos, RPC e Edge disponíveis, auditoria ativa, empresas protegida, frontend integrado, testes Mauro/Karla/comum/cross-tenant aprovados, segredo ausente do frontend e roll-forward documentado. Qualquer falha é NO-GO.

## Classificação local

**A — PRONTA PARA TESTE CONTROLADO.** Inventário/policies de `empresas`, Edge/auditoria local e integração frontend sem fallback foram preparados. Não autoriza migration, SQL remoto, deploy ou ativação funcional.
