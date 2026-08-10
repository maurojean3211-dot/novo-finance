-- Fase 26: eventos manuais de follow-up de abastecimento. Não aplicar automaticamente.

create table if not exists public.pedido_compra_followups (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos_compra(id) on update cascade on delete restrict,
  empresa_id text not null,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  idempotency_key uuid not null,
  data_prometida date,
  prazo_informado text,
  responsavel_contato text,
  observacoes text,
  contatado_em timestamptz not null,
  created_at timestamptz not null default now(),
  unique(empresa_id,idempotency_key)
);

create index if not exists pedido_followups_empresa_pedido_idx on public.pedido_compra_followups(empresa_id,pedido_id,contatado_em desc);
alter table public.pedido_compra_followups enable row level security;
create policy "pedido_followups_select_empresa" on public.pedido_compra_followups for select to authenticated
 using(exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_followups.pedido_id and p.empresa_id=pedido_compra_followups.empresa_id and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=p.empresa_id)));
create policy "pedido_followups_insert_empresa" on public.pedido_compra_followups for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_followups.pedido_id and p.empresa_id=pedido_compra_followups.empresa_id and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=p.empresa_id)));
grant select,insert on public.pedido_compra_followups to authenticated;
comment on table public.pedido_compra_followups is 'Eventos manuais e imutáveis de contato com fornecedor; sem automação de compra ou prazo.';
