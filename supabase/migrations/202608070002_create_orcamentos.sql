create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  cliente_id text not null,
  oportunidade_id uuid references public.crm_oportunidades(id) on update cascade on delete set null,
  numero text not null,
  data date not null default current_date,
  validade date not null,
  observacoes text,
  observacoes_internas text,
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  impostos numeric(14,2) not null default 0 check (impostos >= 0),
  comissao numeric(14,2) not null default 0 check (comissao >= 0),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  valor_final numeric(14,2) not null default 0 check (valor_final >= 0),
  status text not null default 'Rascunho' check (status in ('Rascunho','Em elaboração','Enviado','Aprovado','Rejeitado','Cancelado')),
  cliente_snapshot jsonb not null default '{}'::jsonb,
  condicao_pagamento text,
  prazo_entrega text,
  modalidade_frete text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero)
);

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on update cascade on delete cascade,
  empresa_id text not null,
  catalogo_item_id text,
  produto text not null,
  descricao text,
  liga text,
  tempera text,
  dimensao text,
  peso numeric(14,4) not null default 0 check (peso >= 0),
  quantidade numeric(14,4) not null check (quantidade > 0),
  unidade text not null default 'kg',
  preco_unitario numeric(14,4) not null check (preco_unitario >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  dados_catalogo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.orcamento_historico (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on update cascade on delete cascade,
  empresa_id text not null,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check (tipo in ('Criação','Edição','Envio','Aprovação','Rejeição','Cancelamento')),
  descricao text not null,
  created_at timestamptz not null default now()
);

create index if not exists orcamentos_empresa_status_idx on public.orcamentos (empresa_id, status);
create index if not exists orcamentos_empresa_data_idx on public.orcamentos (empresa_id, data desc);
create index if not exists orcamentos_oportunidade_idx on public.orcamentos (oportunidade_id) where oportunidade_id is not null;
create index if not exists orcamento_itens_orcamento_idx on public.orcamento_itens (orcamento_id);
create index if not exists orcamento_historico_orcamento_idx on public.orcamento_historico (orcamento_id, created_at desc);

alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.orcamento_historico enable row level security;

drop policy if exists "orcamentos_select_empresa" on public.orcamentos;
create policy "orcamentos_select_empresa" on public.orcamentos for select to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = orcamentos.empresa_id));
drop policy if exists "orcamentos_insert_empresa" on public.orcamentos;
create policy "orcamentos_insert_empresa" on public.orcamentos for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = orcamentos.empresa_id));
drop policy if exists "orcamentos_update_empresa" on public.orcamentos;
create policy "orcamentos_update_empresa" on public.orcamentos for update to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = orcamentos.empresa_id)) with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = orcamentos.empresa_id));

drop policy if exists "orcamento_itens_empresa" on public.orcamento_itens;
create policy "orcamento_itens_empresa" on public.orcamento_itens for all to authenticated using (exists (select 1 from public.orcamentos o where o.id = orcamento_itens.orcamento_id and o.empresa_id = orcamento_itens.empresa_id)) with check (exists (select 1 from public.orcamentos o where o.id = orcamento_itens.orcamento_id and o.empresa_id = orcamento_itens.empresa_id));
drop policy if exists "orcamento_historico_select_empresa" on public.orcamento_historico;
create policy "orcamento_historico_select_empresa" on public.orcamento_historico for select to authenticated using (exists (select 1 from public.orcamentos o where o.id = orcamento_historico.orcamento_id and o.empresa_id = orcamento_historico.empresa_id));
drop policy if exists "orcamento_historico_insert_empresa" on public.orcamento_historico;
create policy "orcamento_historico_insert_empresa" on public.orcamento_historico for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.orcamentos o where o.id = orcamento_historico.orcamento_id and o.empresa_id = orcamento_historico.empresa_id));

grant select, insert, update on public.orcamentos to authenticated;
grant select, insert, update, delete on public.orcamento_itens to authenticated;
grant select, insert on public.orcamento_historico to authenticated;

comment on column public.orcamentos.empresa_id is 'Text até a validação remota definitiva do tipo de public.empresas.id.';
comment on column public.orcamentos.cliente_id is 'Text até a validação remota definitiva do tipo de public.clientes.id.';
