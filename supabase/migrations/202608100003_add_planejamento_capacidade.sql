-- Fase 24: planejamento manual de recursos e capacidade. Não aplicar automaticamente.

create table if not exists public.recursos_producao (
  id uuid primary key default gen_random_uuid(), empresa_id text not null, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  nome text not null, tipo text not null check(tipo in ('Máquina','Forno','Serra','Prensa','Linha','Equipe','Posto de trabalho','Outro recurso')),
  descricao text, capacidade_nominal numeric(14,4) check(capacidade_nominal is null or capacidade_nominal>0), unidade_capacidade text,
  horas_disponiveis_dia numeric(5,2) check(horas_disponiveis_dia is null or (horas_disponiveis_dia>0 and horas_disponiveis_dia<=24)),
  dias_trabalho smallint[] not null default '{}'::smallint[], ativo boolean not null default true, observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(empresa_id,nome),
  check(dias_trabalho <@ array[0,1,2,3,4,5,6]::smallint[])
);
create table if not exists public.ordem_producao_recursos (
  id uuid primary key default gen_random_uuid(), ordem_id uuid not null references public.ordens_producao(id) on update cascade on delete restrict,
  recurso_id uuid not null references public.recursos_producao(id) on update cascade on delete restrict, empresa_id text not null,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict, quantidade_planejada numeric(14,4) not null check(quantidade_planejada>0),
  tempo_unitario_horas numeric(12,4) check(tempo_unitario_horas is null or tempo_unitario_horas>0), tempo_total_horas numeric(12,4) check(tempo_total_horas is null or tempo_total_horas>0),
  sequencia integer not null default 1 check(sequencia>0), observacoes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(ordem_id,recurso_id)
);
create table if not exists public.recurso_producao_indisponibilidades (
  id uuid primary key default gen_random_uuid(), recurso_id uuid not null references public.recursos_producao(id) on update cascade on delete restrict,
  empresa_id text not null, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check(tipo in ('Indisponibilidade','Manutenção','Parada programada')), inicio date not null, fim date not null, observacoes text,
  created_at timestamptz not null default now(), check(fim>=inicio)
);
create index if not exists recursos_producao_empresa_idx on public.recursos_producao(empresa_id,ativo);
create index if not exists ordem_recursos_empresa_idx on public.ordem_producao_recursos(empresa_id,recurso_id,sequencia);
create index if not exists recurso_indisponibilidades_idx on public.recurso_producao_indisponibilidades(empresa_id,recurso_id,inicio,fim);
alter table public.recursos_producao enable row level security; alter table public.ordem_producao_recursos enable row level security; alter table public.recurso_producao_indisponibilidades enable row level security;
create policy "recursos_producao_empresa" on public.recursos_producao for all to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=recursos_producao.empresa_id)) with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=recursos_producao.empresa_id));
create policy "ordem_recursos_empresa" on public.ordem_producao_recursos for all to authenticated using(exists(select 1 from public.ordens_producao o where o.id=ordem_producao_recursos.ordem_id and o.empresa_id=ordem_producao_recursos.empresa_id and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=o.empresa_id))) with check(user_id=auth.uid() and exists(select 1 from public.recursos_producao r join public.ordens_producao o on o.id=ordem_producao_recursos.ordem_id where r.id=ordem_producao_recursos.recurso_id and r.empresa_id=ordem_producao_recursos.empresa_id and o.empresa_id=ordem_producao_recursos.empresa_id and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=o.empresa_id)));
create policy "recurso_indisponibilidades_empresa" on public.recurso_producao_indisponibilidades for all to authenticated using(exists(select 1 from public.recursos_producao r where r.id=recurso_producao_indisponibilidades.recurso_id and r.empresa_id=recurso_producao_indisponibilidades.empresa_id and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=r.empresa_id))) with check(user_id=auth.uid() and exists(select 1 from public.recursos_producao r where r.id=recurso_producao_indisponibilidades.recurso_id and r.empresa_id=recurso_producao_indisponibilidades.empresa_id and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=r.empresa_id)));
grant select,insert,update on public.recursos_producao,public.ordem_producao_recursos,public.recurso_producao_indisponibilidades to authenticated;
