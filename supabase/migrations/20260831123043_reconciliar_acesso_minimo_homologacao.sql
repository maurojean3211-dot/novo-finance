begin;

-- ETAPA 1 MINIMA - BUNDLE ATOMICO PARA JANELA CONTROLADA.
-- Alvo de revisao: cunhacontrol-homolog (toiehtfotpjwjslpwdff).
--
-- Este arquivo nao cria usuarios Auth, perfis, empresas, planos, contratos ou
-- modulos. O unico DML permitido classifica como ATIVO, nominalmente, as
-- empresas sinteticas A e B. Nao implementa provisionar_conta_v1.

-- A migration foi desenhada contra o baseline remoto inventariado na Etapa 0.
-- Falha fechada se as relacoes-base nao existirem ou se algum objeto novo ja
-- existir, evitando reconciliacao parcial sobre um estado desconhecido.
do $preflight$
begin
  if to_regclass('public.empresas') is null then
    raise exception 'Preflight: public.empresas ausente.';
  end if;

  if to_regclass('public.usuarios') is null then
    raise exception 'Preflight: public.usuarios ausente.';
  end if;

  if to_regclass('public.planos') is not null
     or to_regclass('public.plano_modulos') is not null
     or to_regclass('public.empresa_modulos') is not null then
    raise exception 'Preflight: catalogo minimo de planos/modulos ja existe; revisar antes de aplicar.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empresas'
      and column_name in ('tipo', 'status', 'plano', 'plano_id', 'valor_mensal')
  ) then
    raise exception 'Preflight: public.empresas ja possui parte dos campos comerciais; revisar antes de aplicar.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usuarios'
      and column_name in ('empresa_id_bloqueada', 'empresa_solicitada', 'valor_mensal')
  ) then
    raise exception 'Preflight: public.usuarios ja possui parte dos campos minimos de LIST_USERS; revisar antes de aplicar.';
  end if;

  if (select count(*) from public.empresas) <> 3
     or (select count(*) from public.usuarios) <> 4 then
    raise exception 'Preflight nominal: esperado exatamente 3 empresas e 4 usuarios.';
  end if;

  if exists (select 1 from public.usuarios where status is distinct from 'ATIVO')
     or (select count(*) from public.usuarios where master_admin is true) <> 1
     or not exists (
       select 1
       from public.usuarios
       where id = '5240b611-77e1-4dc6-85c4-2d379583ade8'::uuid
         and empresa_id is null
         and status = 'ATIVO'
         and master_admin is true
         and role = 'master'
         and tipo_usuario = 'admin_empresa'
     ) then
    raise exception 'Preflight nominal: status de usuario ou master_admin divergiu.';
  end if;

  if not exists (
    select 1 from public.usuarios
    where id = 'a1111111-1111-4111-8111-111111111111'::uuid
      and empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ) or not exists (
    select 1 from public.usuarios
    where id = 'a2222222-2222-4222-8222-222222222222'::uuid
      and empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ) or not exists (
    select 1 from public.usuarios
    where id = 'b1111111-1111-4111-8111-111111111111'::uuid
      and empresa_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  ) then
    raise exception 'Preflight nominal: vinculos A1/A2/B1 divergiram.';
  end if;

  if not exists (
    select 1 from public.empresas
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
      and user_id is null
  ) or exists (
    select 1 from public.usuarios
    where empresa_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
  ) then
    raise exception 'Preflight nominal: Empresa Sintetica C deixou de estar orfa.';
  end if;
end
$preflight$;

create table public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_cliente text not null,
  ativo boolean not null default true,
  valor_mensal numeric(14, 2) not null default 0,
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planos_nome_preenchido_check check (btrim(nome) <> ''),
  constraint planos_tipo_cliente_check check (tipo_cliente in ('PF', 'PJ')),
  constraint planos_valor_mensal_check check (valor_mensal >= 0),
  constraint planos_id_tipo_cliente_key unique (id, tipo_cliente)
);

create unique index planos_tipo_nome_uidx
  on public.planos (tipo_cliente, lower(nome));

create table public.plano_modulos (
  plano_id uuid not null
    references public.planos(id)
    on update restrict
    on delete cascade,
  modulo_key text not null,
  created_at timestamptz not null default now(),
  primary key (plano_id, modulo_key),
  constraint plano_modulos_key_check
    check (modulo_key ~ '^[a-z][a-z0-9_]*$')
);

-- FASE ESTRUTURAL: as colunas permanecem anulaveis para nao classificar por
-- presuncao as tres empresas legadas. Nao ha DML/backfill nesta migration.
-- Os defaults abaixo valem somente para linhas criadas depois desta etapa.
alter table public.empresas
  add column tipo text,
  add column status text,
  add column plano text,
  add column plano_id uuid,
  add column valor_mensal numeric(14, 2) not null default 0;

alter table public.empresas
  alter column tipo set default 'PJ',
  alter column status set default 'SUSPENSO',
  add constraint empresas_tipo_comercial_check
    check (tipo in ('PF', 'PJ')) not valid,
  add constraint empresas_status_comercial_check
    check (status in ('ATIVO', 'SUSPENSO', 'CANCELADO')) not valid,
  add constraint empresas_valor_mensal_check
    check (valor_mensal >= 0) not valid,
  add constraint empresas_plano_tipo_fkey
    foreign key (plano_id, tipo)
    references public.planos(id, tipo_cliente)
    on update restrict
    on delete restrict
    not valid;

-- FASE DE DADOS DEFINITIVA (NAO INCLUIDA / EXIGE AUTORIZACAO SEPARADA):
-- 1. classificar explicitamente o tipo de cada empresa, sem copiar producao;
-- 2. decidir o status da Empresa Sintetica C sem presuncao;
-- 3. somente entao avaliar SET NOT NULL para tipo/status.
-- A excecao minima desta janela e apenas status='ATIVO' para A e B, aplicada
-- nominalmente no bloco atomico abaixo para preservar A1, A2 e B1.

create index empresas_plano_id_idx
  on public.empresas (plano_id);

create table public.empresa_modulos (
  empresa_id uuid not null
    references public.empresas(id)
    on update restrict
    on delete cascade,
  modulo_key text not null,
  habilitado boolean not null,
  alterado_por uuid
    references auth.users(id)
    on update restrict
    on delete set null,
  alterado_em timestamptz not null default now(),
  primary key (empresa_id, modulo_key),
  constraint empresa_modulos_key_check
    check (modulo_key ~ '^[a-z][a-z0-9_]*$')
);

create index empresa_modulos_modulo_key_idx
  on public.empresa_modulos (modulo_key);

-- O CHECK passa a proteger novas linhas e alteracoes sem validar/regravar o
-- historico nesta etapa. A validacao integral fica para uma janela posterior.
alter table public.usuarios
  add column empresa_id_bloqueada uuid
    references public.empresas(id)
    on update restrict
    on delete restrict,
  add column empresa_solicitada text,
  add column valor_mensal numeric(14, 2) not null default 0,
  add constraint usuarios_valor_mensal_check
  check (valor_mensal >= 0) not valid,
  add constraint usuarios_status_canonico_check
  check (status in ('PENDENTE', 'ATIVO', 'REPROVADO', 'BLOQUEADO'))
  not valid;

-- Somente master_admin=true representa administracao global. Em particular,
-- role='master' com master_admin=false (perfil aprovado para Karla) nao passa.
create function public.usuario_eh_master_global()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select coalesce((
    select u.status = 'ATIVO' and u.master_admin is true
    from public.usuarios as u
    where u.id = (select auth.uid())
  ), false)
$function$;

comment on function public.usuario_eh_master_global() is
  'MasterAdmin global: perfil ativo com public.usuarios.master_admin=true.';

-- Impede que clientes autenticados alterem diretamente o contrato comercial
-- por meio das policies ja existentes em empresas. Operacoes administrativas
-- privilegiadas continuam reservadas ao backend ou ao MasterAdmin global.
create function public.proteger_campos_comerciais_empresa()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_privilegiado boolean;
begin
  -- Roles administrativas do banco nao precisam executar a helper de perfil.
  -- Para chamadas autenticadas, somente master_admin=true pode liberar o
  -- escopo global; role='master' e tipo_usuario nao participam desta decisao.
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    v_privilegiado := true;
  else
    v_privilegiado := public.usuario_eh_master_global();
  end if;

  if tg_op = 'INSERT' and not v_privilegiado then
    new.tipo := 'PJ';
    new.status := 'SUSPENSO';
    new.plano := null;
    new.plano_id := null;
    new.valor_mensal := 0;
  elsif tg_op = 'UPDATE'
    and not v_privilegiado
    and (
      new.tipo is distinct from old.tipo
      or new.status is distinct from old.status
      or new.plano is distinct from old.plano
      or new.plano_id is distinct from old.plano_id
      or new.valor_mensal is distinct from old.valor_mensal
    ) then
    raise exception 'Campos comerciais da empresa exigem fluxo administrativo autorizado.'
      using errcode = '42501';
  end if;

  return new;
end
$function$;

create trigger proteger_campos_comerciais_empresa_trg
before insert or update of tipo, status, plano, plano_id, valor_mensal
on public.empresas
for each row
execute function public.proteger_campos_comerciais_empresa();

alter table public.planos enable row level security;
alter table public.plano_modulos enable row level security;
alter table public.empresa_modulos enable row level security;

create policy planos_select_proprio_ou_master_global
on public.planos
for select
to authenticated
using (
  (select public.usuario_eh_master_global())
  or id = (
    select e.plano_id
    from public.usuarios as u
    join public.empresas as e on e.id = u.empresa_id
    where u.id = (select auth.uid())
      and u.status = 'ATIVO'
      and e.status = 'ATIVO'
  )
);

create policy plano_modulos_select_proprio_ou_master_global
on public.plano_modulos
for select
to authenticated
using (
  (select public.usuario_eh_master_global())
  or plano_id = (
    select e.plano_id
    from public.usuarios as u
    join public.empresas as e on e.id = u.empresa_id
    where u.id = (select auth.uid())
      and u.status = 'ATIVO'
      and e.status = 'ATIVO'
  )
);

create policy empresa_modulos_select_proprio_ou_master_global
on public.empresa_modulos
for select
to authenticated
using (
  (select public.usuario_eh_master_global())
  or empresa_id = (
    select u.empresa_id
    from public.usuarios as u
    join public.empresas as e on e.id = u.empresa_id
    where u.id = (select auth.uid())
      and u.status = 'ATIVO'
      and e.status = 'ATIVO'
  )
);

-- Esta etapa habilita somente as leituras exigidas por LIST_USERS. Nenhuma
-- escrita comercial e concedida nas tabelas novas; anon nao recebe acesso.
revoke all on table
  public.planos,
  public.plano_modulos,
  public.empresa_modulos
from public, anon, authenticated, service_role;

grant select on table
  public.planos,
  public.plano_modulos,
  public.empresa_modulos
to authenticated;

grant select on table
  public.planos,
  public.plano_modulos,
  public.empresa_modulos
to service_role;

revoke execute on function public.usuario_eh_master_global()
  from public, anon, authenticated, service_role;
revoke execute on function public.proteger_campos_comerciais_empresa()
  from public, anon, authenticated, service_role;

grant execute on function public.usuario_eh_master_global()
  to authenticated, service_role;

-- DML minimo e nominal. UPDATE e GET DIAGNOSTICS permanecem no mesmo bloco
-- PL/pgSQL; ROW_COUNT refere-se, portanto, ao UPDATE imediatamente anterior.
do $reconciliar_empresas$
declare
  v_linhas integer;
begin
  update public.empresas
  set status = 'ATIVO'
  where id in (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  )
  and status is null;

  get diagnostics v_linhas = row_count;

  if v_linhas <> 2 then
    raise exception
      'Abortado: esperado atualizar exatamente 2 empresas; atualizado=%',
      v_linhas;
  end if;

  if exists (
    select 1
    from public.empresas
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
      and status is not null
  ) then
    raise exception
      'Abortado: Empresa Sintetica C recebeu classificacao nao autorizada.';
  end if;
end
$reconciliar_empresas$;

-- MATCH SIMPLE permite validar a FK composta nas linhas legadas com
-- plano_id/tipo nulos. Os CHECKs tambem aceitam NULL; nenhuma classificacao de
-- tipo, plano ou modulo e introduzida por estas validacoes.
alter table public.empresas
  validate constraint empresas_tipo_comercial_check;
alter table public.empresas
  validate constraint empresas_status_comercial_check;
alter table public.empresas
  validate constraint empresas_valor_mensal_check;
alter table public.empresas
  validate constraint empresas_plano_tipo_fkey;
alter table public.usuarios
  validate constraint usuarios_status_canonico_check;
alter table public.usuarios
  validate constraint usuarios_valor_mensal_check;

-- Assertions criticas. Qualquer RAISE encerra a transacao antes do COMMIT.
do $validacao_critica$
begin
  if not exists (
    select 1 from public.empresas
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      and status = 'ATIVO' and tipo is null
      and plano is null and plano_id is null
  ) or not exists (
    select 1 from public.empresas
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
      and status = 'ATIVO' and tipo is null
      and plano is null and plano_id is null
  ) or not exists (
    select 1 from public.empresas
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
      and status is null and tipo is null
      and plano is null and plano_id is null
  ) then
    raise exception 'Validacao: classificacao final A/B/C divergiu.';
  end if;

  if exists (select 1 from public.planos)
     or exists (select 1 from public.plano_modulos)
     or exists (select 1 from public.empresa_modulos) then
    raise exception 'Validacao: plano, contrato ou modulo foi criado indevidamente.';
  end if;

  if exists (select 1 from public.usuarios where status is distinct from 'ATIVO')
     or (select count(*) from public.usuarios where master_admin is true) <> 1
     or not exists (
       select 1
       from public.usuarios
       where id = '5240b611-77e1-4dc6-85c4-2d379583ade8'::uuid
         and empresa_id is null
         and empresa_id_bloqueada is null
         and empresa_solicitada is null
         and valor_mensal = 0
         and master_admin is true
         and role = 'master'
         and tipo_usuario = 'admin_empresa'
     ) then
    raise exception 'Validacao: autorizacao ou status de usuario foi alterado.';
  end if;

  if exists (
    select 1
    from public.usuarios
    where id <> '5240b611-77e1-4dc6-85c4-2d379583ade8'::uuid
      and (
        empresa_id_bloqueada is not null
        or empresa_solicitada is not null
        or valor_mensal <> 0
        or master_admin is true
      )
  ) or exists (
    select 1
    from public.empresas
    where valor_mensal <> 0
  ) then
    raise exception 'Validacao: colunas minimas de LIST_USERS alteraram dados legados.';
  end if;

  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('planos', 'plano_modulos', 'empresa_modulos')
        and c.relrowsecurity) <> 3
     or (select count(*) from pg_policies
         where schemaname = 'public'
           and policyname in (
             'planos_select_proprio_ou_master_global',
             'plano_modulos_select_proprio_ou_master_global',
             'empresa_modulos_select_proprio_ou_master_global'
           )) <> 3 then
    raise exception 'Validacao: RLS ou policies do catalogo divergiram.';
  end if;

  if has_table_privilege('anon', 'public.planos', 'SELECT')
     or has_table_privilege('anon', 'public.plano_modulos', 'SELECT')
     or has_table_privilege('anon', 'public.empresa_modulos', 'SELECT')
     or not has_table_privilege('authenticated', 'public.planos', 'SELECT')
     or not has_table_privilege('authenticated', 'public.plano_modulos', 'SELECT')
     or not has_table_privilege('authenticated', 'public.empresa_modulos', 'SELECT')
     or has_table_privilege('authenticated', 'public.planos', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     or has_table_privilege('authenticated', 'public.plano_modulos', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     or has_table_privilege('authenticated', 'public.empresa_modulos', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'Validacao: ACL de anon/authenticated divergiu.';
  end if;

  if not has_table_privilege('service_role', 'public.planos', 'SELECT')
     or not has_table_privilege('service_role', 'public.plano_modulos', 'SELECT')
     or not has_table_privilege('service_role', 'public.empresa_modulos', 'SELECT')
     or has_table_privilege('service_role', 'public.planos', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     or has_table_privilege('service_role', 'public.plano_modulos', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     or has_table_privilege('service_role', 'public.empresa_modulos', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'Validacao: ACL de service_role divergiu.';
  end if;

  if has_function_privilege('anon', 'public.usuario_eh_master_global()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.usuario_eh_master_global()', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.usuario_eh_master_global()', 'EXECUTE')
     or has_function_privilege('anon', 'public.proteger_campos_comerciais_empresa()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.proteger_campos_comerciais_empresa()', 'EXECUTE')
     or has_function_privilege('service_role', 'public.proteger_campos_comerciais_empresa()', 'EXECUTE') then
    raise exception 'Validacao: ACL das funcoes divergiu.';
  end if;

  if exists (
    select 1 from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and con.conname in (
        'empresas_tipo_comercial_check',
        'empresas_status_comercial_check',
        'empresas_valor_mensal_check',
        'empresas_plano_tipo_fkey',
        'usuarios_status_canonico_check',
        'usuarios_valor_mensal_check'
      )
      and not con.convalidated
  ) then
    raise exception 'Validacao: constraint nova permaneceu NOT VALID.';
  end if;
end
$validacao_critica$;

commit;
