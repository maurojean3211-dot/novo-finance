# Contrato proposto — Edge Function `admin-users-v1`

Este é um contrato local, não implantado. A função deve usar autenticação de usuário (`verify_jwt=true` e modo `user`) e manter o segredo Supabase exclusivamente no runtime servidor. Nenhuma chave privilegiada integra bundle, resposta ou log do frontend.

## Autorização obrigatória

1. Validar o JWT e obter o usuário pelo contexto autenticado; nunca confiar em ID, email ou `user_metadata` enviados no body.
2. Com o cliente servidor, carregar `public.usuarios` por `id = user.id`.
3. Negar se o perfil estiver ausente.
4. Aplicar a regra explícita:
   - `master_admin=true`: administrador global, mas toda operação ainda exige `target_empresa_id` explícito e existente;
   - `master_admin=false AND role='master'`: administrador somente de `caller.empresa_id`;
   - qualquer outro perfil: `403`.
5. Nunca aceitar `caller_id`, escopo global implícito ou listagem sem tenant.

Decisão funcional formal: Mauro CUNHA, vinculado à empresa `8a85591b-2410-405f-8279-910dbcf61011`, é o usuário esperado para `master_admin=true`. O ID Auth/perfil exato deve ser confirmado pelo preflight; esta proposal não altera o dado. Karla (`3c5ce0fd-20a9-455f-8279-910dbcf61011`) permanece tenant separado.

## Operações v1

### `LIST_USERS`

Entrada: `{ action: "LIST_USERS", target_empresa_id }`.

Retorna somente `id`, `nome`, `email`, `empresa_id`, `role`, `tipo_usuario`, `nivel`, `permissoes` e flags funcionais necessárias. A consulta administrativa deve sempre conter `.eq("empresa_id", targetEmpresaId)`. Não retornar CPF, PIX ou WhatsApp.

### `INVITE_USER`

Entrada: `{ action: "INVITE_USER", target_empresa_id, email, nome }`.

Sequência:

1. autorizar tenant;
2. validar e normalizar email/nome no servidor;
3. confirmar que a empresa existe;
4. confirmar ausência de perfil com o email/ID retornado;
5. chamar `auth.admin.inviteUserByEmail` no servidor;
6. inserir `public.usuarios` com o ID retornado, empresa alvo e valores fixos: `role=cliente`, `tipo_usuario=usuario`, `nivel=usuario`, `master_admin=false`, `permissoes=null`, flags falsas;
7. se o INSERT falhar e o convite tiver sido criado nesta requisição, tentar compensação imediata com `auth.admin.deleteUser(createdId)` e registrar somente IDs/código técnico, nunca token ou segredo;
8. se a compensação falhar, responder erro crítico e encaminhar para reconciliação humana.

Auth e Postgres não compartilham transação; por isso o convite usa saga com compensação, não promete atomicidade impossível.

### `UPDATE_PERMISSIONS`

Entrada: `{ action: "UPDATE_PERMISSIONS", target_empresa_id, user_id, permissoes, flags }`.

Permitir somente chaves conhecidas de `permissoes` e estas flags booleanas: `pode_financeiro`, `pode_emprestimos`, `pode_compras`, `pode_vendas`, `pode_contas_pagar`, `financeiro`, `emprestimos`, `vendas`, `compras`, `contas_pagar`, `isento`.

Antes do UPDATE, carregar o alvo por `id + empresa_id`. Negar alteração de perfis com `master_admin=true` ou `role='master'`. O UPDATE deve filtrar novamente por `id + empresa_id` e verificar exatamente uma linha afetada.

## Operações deliberadamente ausentes

- alterar `empresa_id`;
- alterar `role`, `tipo_usuario`, `nivel` ou `master_admin`;
- promover o próprio chamador;
- associar conta Auth preexistente;
- excluir usuário;
- desativar usuário;
- revogar sessões.

`DISABLE_USER` não integra a v1: `usuarios` não possui coluna `ativo` confirmada e exclusão Auth não garante invalidação imediata de tokens. Implementar somente após desenho de estado, revogação e auditoria.

Essas operações exigem decisão funcional, coluna de estado/revogação comprovada e trilha de auditoria. A Edge Function deve responder `400` para campos proibidos e `404/405` para ações fora da allowlist.

## Respostas e observabilidade

- `401`: JWT ausente/inválido;
- `403`: chamador ou tenant não autorizado;
- `400`: payload/campo proibido;
- `409`: identidade/perfil já existente ou estado inconsistente;
- `500`: falha interna sem detalhes sensíveis.

Logs devem incluir request ID, action, caller ID, target tenant, target user ID quando houver e resultado. Não registrar JWT, secret key, CPF, PIX, senha ou payload completo.

## Auditoria obrigatória antes do primeiro uso

Nenhuma mutação administrativa pode ser habilitada sem trilha persistente, protegida e escrita somente pelo backend. Modelo mínimo futuro:

- `id uuid`;
- `actor_user_id uuid`;
- `actor_empresa_id uuid`;
- `target_user_id uuid` quando aplicável;
- `target_empresa_id uuid` obrigatório;
- `action text` com CHECK/enum de operações;
- `payload jsonb` resumido e allowlisted;
- `created_at timestamptz`.

Não registrar token, senha, secret/service role, CPF, PIX ou conteúdo integral de permissões. Para mutações Postgres, a gravação de auditoria deve ocorrer na mesma transação; para convite Auth, registrar estado/compensação da saga. Falha ao auditar deve abortar a operação ou produzir NO-GO operacional.
