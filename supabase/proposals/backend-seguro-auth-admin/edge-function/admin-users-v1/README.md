# `admin-users-v1` — implementação local não implantada

Edge Function autenticada para `LIST_USERS`, `INVITE_USER` e `UPDATE_PERMISSIONS`.

- `verify_jwt` deve permanecer `true` no eventual deploy autorizado.
- O JWT também é validado com `auth.getUser()` antes de qualquer consulta.
- `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY` é lida somente no runtime servidor.
- Nenhum UUID, nome ou email autoriza master global; somente `usuarios.master_admin=true`.
- Todo request exige `target_empresa_id` existente.
- Admin tenant opera somente o próprio tenant.
- `DISABLE_USER`, promoção, role e troca de tenant ficam fora da v1.
- Toda ação gera `admin_audit_log`; falha de auditoria aborta ou compensa a mutação.

Auth e Postgres não compartilham transação. `INVITE_USER` usa saga: se perfil/auditoria falhar, remove perfil eventualmente criado e tenta excluir o usuário Auth recém-convidado.

Este diretório está dentro de `supabase/proposals/` para impedir que seja confundido com uma função pronta para deploy.
