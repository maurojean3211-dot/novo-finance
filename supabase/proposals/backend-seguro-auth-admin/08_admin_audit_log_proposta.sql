-- PROPOSAL — NÃO EXECUTAR.
-- Trilha obrigatória antes do primeiro uso administrativo real.
begin;

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  actor_empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  target_user_id uuid null references auth.users(id) on update cascade on delete set null,
  target_empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  action text not null check (action in ('LIST_USERS','INVITE_USER','UPDATE_PERMISSIONS')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'),
  created_at timestamptz not null default now()
);

create index admin_audit_log_target_created_idx
  on public.admin_audit_log(target_empresa_id,created_at desc);
create index admin_audit_log_actor_created_idx
  on public.admin_audit_log(actor_user_id,created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all privileges on table public.admin_audit_log from public,anon,authenticated;
grant select,insert on table public.admin_audit_log to service_role;
-- Nenhuma policy comum é criada; a tabela não é escrita nem lida diretamente
-- pelo navegador. service_role continua exclusivamente servidor.

comment on table public.admin_audit_log is
  'Auditoria administrativa servidor-only; payload deve ser resumido e allowlisted, sem segredos ou PII.';
commit;
