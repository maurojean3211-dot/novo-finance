begin;

-- Etapa 1 do núcleo comercial. Esta migration cria somente o catálogo de
-- planos/módulos e a autorização central. Ela não altera as policies das
-- tabelas de negócio existentes.

do $$
declare
  v_tipos_invalidos text;
  v_status_invalidos text;
begin
  select string_agg(distinct e.tipo, ', ' order by e.tipo)
    into v_tipos_invalidos
  from public.empresas e
  where nullif(btrim(e.tipo), '') is not null
    and lower(btrim(e.tipo)) not in (
      'empresa', 'pj', 'pessoa juridica', 'pessoa jurídica',
      'pf', 'pessoa fisica', 'pessoa física'
    );

  if v_tipos_invalidos is not null then
    raise exception 'Preflight: empresas.tipo contém valores não reconhecidos: %', v_tipos_invalidos;
  end if;

  select string_agg(distinct e.status, ', ' order by e.status)
    into v_status_invalidos
  from public.empresas e
  where nullif(btrim(e.status), '') is not null
    and lower(btrim(e.status)) not in (
      'ativo', 'ativa',
      'suspenso', 'suspensa', 'bloqueado', 'bloqueada',
      'cancelado', 'cancelada'
    );

  if v_status_invalidos is not null then
    raise exception 'Preflight: empresas.status contém valores não reconhecidos: %', v_status_invalidos;
  end if;
end;
$$;

create table public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_cliente text not null,
  ativo boolean not null default true,
  valor_mensal numeric(14,2) not null default 0,
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
  plano_id uuid not null references public.planos(id) on delete cascade,
  modulo_key text not null,
  created_at timestamptz not null default now(),
  primary key (plano_id, modulo_key),
  constraint plano_modulos_key_check
    check (modulo_key ~ '^[a-z][a-z0-9_]*$')
);

alter table public.empresas
  add column plano_id uuid;

-- Canonização compatível: os textos antigos reconhecidos são convertidos;
-- o campo plano textual é preservado como rótulo legado.
update public.empresas
set tipo = case
  when nullif(btrim(tipo), '') is null then 'PJ'
  when lower(btrim(tipo)) in ('empresa', 'pj', 'pessoa juridica', 'pessoa jurídica') then 'PJ'
  when lower(btrim(tipo)) in ('pf', 'pessoa fisica', 'pessoa física') then 'PF'
end;

update public.empresas
set status = case
  when nullif(btrim(status), '') is null then 'ATIVO'
  when lower(btrim(status)) in ('ativo', 'ativa') then 'ATIVO'
  when lower(btrim(status)) in ('suspenso', 'suspensa', 'bloqueado', 'bloqueada') then 'SUSPENSO'
  when lower(btrim(status)) in ('cancelado', 'cancelada') then 'CANCELADO'
end;

update public.empresas
set plano = nullif(btrim(plano), '');

alter table public.empresas
  alter column tipo set default 'PJ',
  alter column tipo set not null,
  alter column status set default 'SUSPENSO',
  alter column status set not null,
  add constraint empresas_tipo_comercial_check check (tipo in ('PF', 'PJ')),
  add constraint empresas_status_comercial_check check (status in ('ATIVO', 'SUSPENSO', 'CANCELADO'));

-- Cada nome de plano legado vira um plano do mesmo tipo de cliente. Nenhum
-- módulo é concedido automaticamente nesta etapa.
insert into public.planos (nome, tipo_cliente, ativo, valor_mensal, descricao)
select distinct
  e.plano,
  e.tipo,
  true,
  coalesce(e.valor_mensal, e.valor, 0),
  'Plano legado reconciliado automaticamente'
from public.empresas e
where e.plano is not null
on conflict (tipo_cliente, (lower(nome))) do nothing;

update public.empresas e
set plano_id = p.id
from public.planos p
where p.tipo_cliente = e.tipo
  and lower(p.nome) = lower(e.plano)
  and e.plano_id is null;

alter table public.empresas
  add constraint empresas_plano_tipo_fkey
  foreign key (plano_id, tipo)
  references public.planos (id, tipo_cliente)
  on update restrict
  on delete restrict;

create index empresas_plano_id_idx on public.empresas (plano_id);

create table public.empresa_modulos (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  modulo_key text not null,
  habilitado boolean not null,
  alterado_por uuid references auth.users(id) on delete set null,
  alterado_em timestamptz not null default now(),
  primary key (empresa_id, modulo_key),
  constraint empresa_modulos_key_check
    check (modulo_key ~ '^[a-z][a-z0-9_]*$')
);

create index empresa_modulos_modulo_key_idx
  on public.empresa_modulos (modulo_key);

create or replace function public.usuario_eh_master()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select coalesce((
    select
      u.status = 'ATIVO'
      and (coalesce(u.master_admin, false) or lower(coalesce(u.role, '')) = 'master')
    from public.usuarios u
    where u.id = (select auth.uid())
  ), false);
$$;

comment on function public.usuario_eh_master() is
  'Verifica o perfil Master autenticado usando public.usuarios; não usa user_metadata.';

create or replace function public.usuario_tem_modulo(p_modulo text)
returns boolean
language plpgsql
stable
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_empresa_id uuid;
  v_plano_id uuid;
  v_tipo_cliente text;
  v_permissoes jsonb;
  v_contratado boolean;
begin
  if (select auth.uid()) is null
     or p_modulo is null
     or p_modulo !~ '^[a-z][a-z0-9_]*$' then
    return false;
  end if;

  select u.empresa_id, e.tipo, coalesce(u.permissoes, '{}'::jsonb)
    into v_empresa_id, v_tipo_cliente, v_permissoes
  from public.usuarios u
  join public.empresas e on e.id = u.empresa_id
  where u.id = (select auth.uid())
    and u.status = 'ATIVO'
    and e.status = 'ATIVO';

  if v_empresa_id is null then
    return false;
  end if;

  if v_tipo_cliente = 'PF'
     and p_modulo not in (
       'financas_pessoais',
       'pessoal_visao_geral',
       'pessoal_receitas',
       'pessoal_despesas',
       'pessoal_contas_pagar',
       'pessoal_contas_fixas',
       'pessoal_orcamentos',
       'pessoal_recorrencias',
       'pessoal_relatorios'
     ) then
    return false;
  end if;

  select e.plano_id
    into v_plano_id
  from public.empresas e
  where e.id = v_empresa_id;

  select em.habilitado
    into v_contratado
  from public.empresa_modulos em
  where em.empresa_id = v_empresa_id
    and em.modulo_key = p_modulo;

  if not found then
    v_contratado := exists (
      select 1
      from public.plano_modulos pm
      join public.planos p on p.id = pm.plano_id
      where pm.plano_id = v_plano_id
        and pm.modulo_key = p_modulo
        and p.ativo
    );
  end if;

  return coalesce(v_contratado, false)
    and v_permissoes @> jsonb_build_object(p_modulo, true);
end;
$$;

comment on function public.usuario_tem_modulo(text) is
  'Acesso efetivo = usuário ativo + assinatura ativa + módulo contratado + permissão individual.';

-- Protege os campos comerciais adicionados/reutilizados em empresas. O
-- service_role é reservado à Edge Function administrativa, que já autentica
-- e valida o Master antes de usar a chave privilegiada.
create or replace function public.proteger_campos_comerciais_empresa()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_privilegiado boolean := current_user in ('postgres', 'service_role', 'supabase_admin')
    or public.usuario_eh_master();
begin
  if tg_op = 'INSERT' and not v_privilegiado then
    new.tipo := 'PJ';
    new.status := 'SUSPENSO';
    new.plano := null;
    new.plano_id := null;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and not v_privilegiado
     and (
       new.tipo is distinct from old.tipo
       or new.status is distinct from old.status
       or new.plano is distinct from old.plano
       or new.plano_id is distinct from old.plano_id
     ) then
    raise exception 'Somente o Master pode alterar tipo, status, plano ou módulos contratados.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger proteger_campos_comerciais_empresa_trg
before insert or update of tipo, status, plano, plano_id
on public.empresas
for each row execute function public.proteger_campos_comerciais_empresa();

alter table public.planos enable row level security;
alter table public.plano_modulos enable row level security;
alter table public.empresa_modulos enable row level security;

create policy planos_select_v1
on public.planos
for select
to authenticated
using (
  public.usuario_eh_master()
  or id = (
    select e.plano_id
    from public.empresas e
    join public.usuarios u on u.empresa_id = e.id
    where u.id = (select auth.uid())
  )
);

create policy planos_master_insert_v1
on public.planos for insert to authenticated
with check (public.usuario_eh_master());

create policy planos_master_update_v1
on public.planos for update to authenticated
using (public.usuario_eh_master())
with check (public.usuario_eh_master());

create policy planos_master_delete_v1
on public.planos for delete to authenticated
using (public.usuario_eh_master());

create policy plano_modulos_select_v1
on public.plano_modulos
for select
to authenticated
using (
  public.usuario_eh_master()
  or plano_id = (
    select e.plano_id
    from public.empresas e
    join public.usuarios u on u.empresa_id = e.id
    where u.id = (select auth.uid())
  )
);

create policy plano_modulos_master_insert_v1
on public.plano_modulos for insert to authenticated
with check (public.usuario_eh_master());

create policy plano_modulos_master_update_v1
on public.plano_modulos for update to authenticated
using (public.usuario_eh_master())
with check (public.usuario_eh_master());

create policy plano_modulos_master_delete_v1
on public.plano_modulos for delete to authenticated
using (public.usuario_eh_master());

create policy empresa_modulos_select_v1
on public.empresa_modulos
for select
to authenticated
using (
  public.usuario_eh_master()
  or empresa_id = (
    select u.empresa_id
    from public.usuarios u
    where u.id = (select auth.uid())
  )
);

create policy empresa_modulos_master_insert_v1
on public.empresa_modulos for insert to authenticated
with check (public.usuario_eh_master());

create policy empresa_modulos_master_update_v1
on public.empresa_modulos for update to authenticated
using (public.usuario_eh_master())
with check (public.usuario_eh_master());

create policy empresa_modulos_master_delete_v1
on public.empresa_modulos for delete to authenticated
using (public.usuario_eh_master());

revoke all on public.planos from anon;
revoke all on public.plano_modulos from anon;
revoke all on public.empresa_modulos from anon;

grant select, insert, update, delete on public.planos to authenticated;
grant select, insert, update, delete on public.plano_modulos to authenticated;
grant select, insert, update, delete on public.empresa_modulos to authenticated;

revoke execute on function public.usuario_eh_master() from public, anon;
revoke execute on function public.usuario_tem_modulo(text) from public, anon;
revoke execute on function public.proteger_campos_comerciais_empresa() from public, anon;

grant execute on function public.usuario_eh_master() to authenticated;
grant execute on function public.usuario_tem_modulo(text) to authenticated;

commit;
