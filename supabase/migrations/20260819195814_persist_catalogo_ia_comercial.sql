begin;

create table public.catalogo_produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid references auth.users(id) on update cascade on delete set null,
  codigo text not null,
  nome text not null,
  descricao text,
  categoria text,
  status text not null default 'Ativo',
  dados_tecnicos jsonb not null default '{}'::jsonb,
  dados_comerciais jsonb not null default '{}'::jsonb,
  fornecedor_principal text,
  dados_origem jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_produtos_id_empresa_key unique(id, empresa_id),
  constraint catalogo_produtos_empresa_codigo_key unique(empresa_id, codigo)
);

create table public.catalogo_importacoes (
  id text primary key,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  status text not null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ia_comercial_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on update cascade on delete cascade,
  comando text not null,
  resultado jsonb not null default '{}'::jsonb,
  atendimento jsonb,
  created_at timestamptz not null default now()
);

create index catalogo_produtos_empresa_status_idx on public.catalogo_produtos(empresa_id, status);
create index catalogo_importacoes_empresa_created_idx on public.catalogo_importacoes(empresa_id, created_at desc);
create index ia_comercial_historico_empresa_user_idx on public.ia_comercial_historico(empresa_id, user_id, created_at desc);

alter table public.catalogo_produtos enable row level security;
alter table public.catalogo_importacoes enable row level security;
alter table public.ia_comercial_historico enable row level security;

create policy catalogo_produtos_tenant on public.catalogo_produtos for all to authenticated
using (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=catalogo_produtos.empresa_id))
with check (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=catalogo_produtos.empresa_id));

create policy catalogo_importacoes_tenant on public.catalogo_importacoes for all to authenticated
using (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=catalogo_importacoes.empresa_id))
with check (user_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=catalogo_importacoes.empresa_id));

create policy ia_comercial_historico_tenant on public.ia_comercial_historico for all to authenticated
using (user_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=ia_comercial_historico.empresa_id))
with check (user_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=ia_comercial_historico.empresa_id));

grant select, insert, update, delete on public.catalogo_produtos, public.catalogo_importacoes to authenticated;
grant select, insert, delete on public.ia_comercial_historico to authenticated;

commit;
