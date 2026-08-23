-- Fase 24: planejamento manual de recursos e capacidade. Não aplicar automaticamente.

create table public.recursos_producao (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  nome text not null, tipo text not null check(tipo in ('Máquina','Forno','Serra','Prensa','Linha','Equipe','Posto de trabalho','Outro recurso')),
  descricao text, capacidade_nominal numeric(14,4) check(capacidade_nominal is null or capacidade_nominal>0), unidade_capacidade text,
  horas_disponiveis_dia numeric(5,2) check(horas_disponiveis_dia is null or (horas_disponiveis_dia>0 and horas_disponiveis_dia<=24)),
  dias_trabalho smallint[] not null default '{}'::smallint[], ativo boolean not null default true, observacoes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,empresa_id), unique(empresa_id,nome),
  check(dias_trabalho <@ array[0,1,2,3,4,5,6]::smallint[])
);
create table public.ordem_producao_recursos (
  id uuid primary key default gen_random_uuid(), ordem_id uuid not null,
  recurso_id uuid not null, empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict, quantidade_planejada numeric(14,4) not null check(quantidade_planejada>0),
  tempo_unitario_horas numeric(12,4) check(tempo_unitario_horas is null or tempo_unitario_horas>0), tempo_total_horas numeric(12,4) check(tempo_total_horas is null or tempo_total_horas>0),
  sequencia integer not null default 1 check(sequencia>0), observacoes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(ordem_id,recurso_id),
  foreign key(ordem_id,empresa_id) references public.ordens_producao(id,empresa_id) on update cascade on delete restrict,
  foreign key(recurso_id,empresa_id) references public.recursos_producao(id,empresa_id) on update cascade on delete restrict
);
create table public.recurso_producao_indisponibilidades (
  id uuid primary key default gen_random_uuid(), recurso_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check(tipo in ('Indisponibilidade','Manutenção','Parada programada')), inicio date not null, fim date not null, observacoes text,
  created_at timestamptz not null default now(), check(fim>=inicio),
  foreign key(recurso_id,empresa_id) references public.recursos_producao(id,empresa_id) on update cascade on delete restrict
);
create index if not exists recursos_producao_empresa_idx on public.recursos_producao(empresa_id,ativo);
create index if not exists ordem_recursos_empresa_idx on public.ordem_producao_recursos(empresa_id,recurso_id,sequencia);
create index if not exists recurso_indisponibilidades_idx on public.recurso_producao_indisponibilidades(empresa_id,recurso_id,inicio,fim);
alter table public.recursos_producao enable row level security; alter table public.ordem_producao_recursos enable row level security; alter table public.recurso_producao_indisponibilidades enable row level security;
create policy "recursos_producao_empresa" on public.recursos_producao for select to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=recursos_producao.empresa_id));
create policy "recursos_producao_insert_empresa" on public.recursos_producao for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=recursos_producao.empresa_id));
create policy "recursos_producao_update_empresa" on public.recursos_producao for update to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=recursos_producao.empresa_id)) with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=recursos_producao.empresa_id));
create policy "ordem_recursos_empresa" on public.ordem_producao_recursos for select to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_recursos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_recursos.ordem_id and o.empresa_id=ordem_producao_recursos.empresa_id) and exists(select 1 from public.recursos_producao r where r.id=ordem_producao_recursos.recurso_id and r.empresa_id=ordem_producao_recursos.empresa_id));
create policy "ordem_recursos_insert_empresa" on public.ordem_producao_recursos for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_recursos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_recursos.ordem_id and o.empresa_id=ordem_producao_recursos.empresa_id) and exists(select 1 from public.recursos_producao r where r.id=ordem_producao_recursos.recurso_id and r.empresa_id=ordem_producao_recursos.empresa_id));
create policy "ordem_recursos_update_empresa" on public.ordem_producao_recursos for update to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_recursos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_recursos.ordem_id and o.empresa_id=ordem_producao_recursos.empresa_id) and exists(select 1 from public.recursos_producao r where r.id=ordem_producao_recursos.recurso_id and r.empresa_id=ordem_producao_recursos.empresa_id)) with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_recursos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_recursos.ordem_id and o.empresa_id=ordem_producao_recursos.empresa_id) and exists(select 1 from public.recursos_producao r where r.id=ordem_producao_recursos.recurso_id and r.empresa_id=ordem_producao_recursos.empresa_id));
create policy "recurso_indisponibilidades_empresa" on public.recurso_producao_indisponibilidades for select to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=recurso_producao_indisponibilidades.empresa_id) and exists(select 1 from public.recursos_producao r where r.id=recurso_producao_indisponibilidades.recurso_id and r.empresa_id=recurso_producao_indisponibilidades.empresa_id));
create policy "recurso_indisponibilidades_insert_empresa" on public.recurso_producao_indisponibilidades for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=recurso_producao_indisponibilidades.empresa_id) and exists(select 1 from public.recursos_producao r where r.id=recurso_producao_indisponibilidades.recurso_id and r.empresa_id=recurso_producao_indisponibilidades.empresa_id));
create policy "recurso_indisponibilidades_update_empresa" on public.recurso_producao_indisponibilidades for update to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=recurso_producao_indisponibilidades.empresa_id) and exists(select 1 from public.recursos_producao r where r.id=recurso_producao_indisponibilidades.recurso_id and r.empresa_id=recurso_producao_indisponibilidades.empresa_id)) with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=recurso_producao_indisponibilidades.empresa_id) and exists(select 1 from public.recursos_producao r where r.id=recurso_producao_indisponibilidades.recurso_id and r.empresa_id=recurso_producao_indisponibilidades.empresa_id));
grant select,insert,update on public.recursos_producao,public.ordem_producao_recursos,public.recurso_producao_indisponibilidades to authenticated;
