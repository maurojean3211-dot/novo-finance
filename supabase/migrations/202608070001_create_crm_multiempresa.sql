-- FASE 16 CRM - MIGRATION REVISADA MULTIEMPRESA
-- PROPOSTA - NAO EXECUTAR SEM AUTORIZACAO
BEGIN;

do $$
begin
  -- CRM deve estar ausente antes da primeira aplicacao.
  if to_regclass('public.crm_oportunidades') is not null
     or to_regclass('public.crm_oportunidade_historico') is not null then
    raise exception
      'ABORTADO: tabela CRM ja existe; revisar antes de aplicar';
  end if;

  -- empresas.id precisa ser UUID.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empresas'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    raise exception
      'ABORTADO: public.empresas.id nao e uuid ou nao existe';
  end if;

  -- usuarios.id e usuarios.empresa_id precisam ser UUID.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usuarios'
      and column_name = 'id'
      and udt_name = 'uuid'
  )
  or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usuarios'
      and column_name = 'empresa_id'
      and udt_name = 'uuid'
  ) then
    raise exception
      'ABORTADO: public.usuarios.id/empresa_id incompativeis';
  end if;

  -- clientes.id precisa ser UUID.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clientes'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    raise exception
      'ABORTADO: public.clientes.id nao e uuid ou nao existe';
  end if;

  -- clientes.empresa_id precisa ser UUID e NOT NULL.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clientes'
      and column_name = 'empresa_id'
      and udt_name = 'uuid'
      and is_nullable = 'NO'
  ) then
    raise exception
      'ABORTADO: public.clientes.empresa_id nao e uuid NOT NULL';
  end if;

  -- A estrutura multiempresa de clientes precisa estar instalada.
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clientes'::regclass
      and conname = 'clientes_empresa_fkey'
      and contype = 'f'
  ) then
    raise exception
      'ABORTADO: FK clientes_empresa_fkey nao existe';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clientes'::regclass
      and conname = 'clientes_id_empresa_key'
      and contype = 'u'
  ) then
    raise exception
      'ABORTADO: UNIQUE clientes_id_empresa_key nao existe';
  end if;
end $$;


-- ============================================================
-- OPORTUNIDADES
-- ============================================================

create table public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null
    references public.empresas(id)
    on update cascade
    on delete restrict,

  user_id uuid
    references auth.users(id)
    on update cascade
    on delete set null,

  cliente_id uuid,

  cliente_nome text,
  empresa_cliente text not null,
  telefone text,
  whatsapp text,
  email text,
  cidade text,
  estado text,
  pais text,
  origem text,
  segmento text,
  produto_material text,

  quantidade numeric
    check (quantidade is null or quantidade >= 0),

  unidade text,

  valor_estimado numeric not null default 0
    check (valor_estimado >= 0),

  probabilidade numeric not null default 0
    check (probabilidade between 0 and 100),

  etapa text not null default 'Novo contato'
    check (
      etapa in (
        'Novo contato',
        'Qualificação',
        'Proposta em preparação',
        'Proposta enviada',
        'Negociação',
        'Fechado — ganho',
        'Fechado — perdido'
      )
    ),

  prioridade text not null default 'Média'
    check (
      prioridade in (
        'Alta',
        'Média',
        'Baixa'
      )
    ),

  responsavel text,
  previsao_fechamento date,
  observacoes text,
  motivo_perda text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint crm_oportunidades_id_empresa_key
    unique (id, empresa_id),

  -- PROTECAO MULTIEMPRESA:
  -- cliente e oportunidade precisam pertencer ao mesmo tenant.
  constraint crm_oportunidade_cliente_tenant_fkey
    foreign key (cliente_id, empresa_id)
    references public.clientes(id, empresa_id)
    on update cascade
    on delete set null (cliente_id)
);


-- ============================================================
-- HISTORICO
-- ============================================================

create table public.crm_oportunidade_historico (
  id uuid primary key default gen_random_uuid(),

  oportunidade_id uuid not null,

  empresa_id uuid not null
    references public.empresas(id)
    on update cascade
    on delete restrict,

  user_id uuid
    references auth.users(id)
    on update cascade
    on delete set null,

  tipo text not null,
  descricao text not null,

  created_at timestamptz not null default now(),

  constraint crm_historico_oportunidade_tenant_fkey
    foreign key (oportunidade_id, empresa_id)
    references public.crm_oportunidades(id, empresa_id)
    on update cascade
    on delete cascade
);


-- ============================================================
-- INDICES
-- ============================================================

create index crm_oportunidades_empresa_etapa_idx
  on public.crm_oportunidades(empresa_id, etapa);

create index crm_oportunidades_empresa_responsavel_idx
  on public.crm_oportunidades(empresa_id, responsavel);

create index crm_oportunidades_empresa_previsao_idx
  on public.crm_oportunidades(empresa_id, previsao_fechamento);

create index crm_oportunidades_empresa_created_idx
  on public.crm_oportunidades(empresa_id, created_at desc);

create index crm_oportunidades_empresa_cliente_idx
  on public.crm_oportunidades(empresa_id, cliente_id);

create index crm_historico_empresa_oportunidade_idx
  on public.crm_oportunidade_historico(
    empresa_id,
    oportunidade_id,
    created_at desc
  );


-- ============================================================
-- UPDATED_AT
-- ============================================================

create function public.crm_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all
on function public.crm_set_updated_at()
from public, anon, authenticated;


-- ============================================================
-- PROTECAO DE TENANT/AUTORIA
-- ============================================================

create function public.crm_protect_opportunity_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is not null
     and (
       new.empresa_id is distinct from old.empresa_id
       or new.user_id is distinct from old.user_id
     ) then

    raise exception
      'Tenant e autoria da oportunidade nao podem ser alterados';
  end if;

  return new;
end;
$$;

revoke all
on function public.crm_protect_opportunity_scope()
from public, anon, authenticated;


-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger crm_oportunidades_set_updated_at
before update on public.crm_oportunidades
for each row
execute function public.crm_set_updated_at();

create trigger crm_oportunidades_protect_scope
before update on public.crm_oportunidades
for each row
execute function public.crm_protect_opportunity_scope();


-- ============================================================
-- RLS
-- ============================================================

alter table public.crm_oportunidades
enable row level security;

alter table public.crm_oportunidade_historico
enable row level security;


-- ============================================================
-- RLS OPORTUNIDADES
-- ============================================================

create policy crm_oportunidades_select_tenant
on public.crm_oportunidades
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.empresa_id = crm_oportunidades.empresa_id
  )
);


create policy crm_oportunidades_insert_tenant
on public.crm_oportunidades
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.empresa_id = crm_oportunidades.empresa_id
  )
);


create policy crm_oportunidades_update_tenant
on public.crm_oportunidades
for update
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.empresa_id = crm_oportunidades.empresa_id
  )
)
with check (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.empresa_id = crm_oportunidades.empresa_id
  )
);


create policy crm_oportunidades_delete_tenant
on public.crm_oportunidades
for delete
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.empresa_id = crm_oportunidades.empresa_id
  )
);


-- ============================================================
-- RLS HISTORICO
-- ============================================================

create policy crm_historico_select_tenant
on public.crm_oportunidade_historico
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.empresa_id = crm_oportunidade_historico.empresa_id
  )
);


create policy crm_historico_insert_tenant
on public.crm_oportunidade_historico
for insert
to authenticated
with check (
  user_id = auth.uid()

  and exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.empresa_id = crm_oportunidade_historico.empresa_id
  )

  and exists (
    select 1
    from public.crm_oportunidades o
    where o.id = crm_oportunidade_historico.oportunidade_id
      and o.empresa_id = crm_oportunidade_historico.empresa_id
  )
);


-- ============================================================
-- PERMISSOES
-- ============================================================

grant select, insert, update, delete
on public.crm_oportunidades
to authenticated;

grant select, insert
on public.crm_oportunidade_historico
to authenticated;


COMMIT;