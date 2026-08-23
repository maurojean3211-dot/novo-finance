-- Fase 23: custos adicionais manuais da produção. Não aplicar automaticamente.

create table public.ordem_producao_custos (
  id uuid primary key default gen_random_uuid(),
  ordem_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check (tipo in ('Mão de obra','Energia','Máquina/equipamento','Terceiros','Transporte interno','Outros custos operacionais')),
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),
  data date not null default current_date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (ordem_id, empresa_id) references public.ordens_producao(id, empresa_id) on update cascade on delete restrict
);

create index if not exists ordem_producao_custos_ordem_idx on public.ordem_producao_custos(ordem_id, data desc);
create index if not exists ordem_producao_custos_empresa_idx on public.ordem_producao_custos(empresa_id, created_at desc);

alter table public.ordem_producao_custos enable row level security;

create policy "ordem_producao_custos_select_empresa" on public.ordem_producao_custos for select to authenticated
using (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_custos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_custos.ordem_id and o.empresa_id=ordem_producao_custos.empresa_id));

create policy "ordem_producao_custos_insert_empresa" on public.ordem_producao_custos for insert to authenticated
with check (user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_custos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_custos.ordem_id and o.empresa_id=ordem_producao_custos.empresa_id));

create policy "ordem_producao_custos_update_empresa" on public.ordem_producao_custos for update to authenticated
using (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_custos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_custos.ordem_id and o.empresa_id=ordem_producao_custos.empresa_id))
with check (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_custos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_custos.ordem_id and o.empresa_id=ordem_producao_custos.empresa_id));

grant select,insert,update on public.ordem_producao_custos to authenticated;
