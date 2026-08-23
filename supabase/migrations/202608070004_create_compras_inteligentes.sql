create table public.pedidos_compra (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
 fornecedor_id text not null, fornecedor_snapshot jsonb not null default '{}'::jsonb, numero text not null, status text not null default 'Rascunho' check(status in ('Rascunho','Solicitado','Em cotação','Aprovado','Comprado','Recebido parcialmente','Recebido','Cancelado')),
 data date not null default current_date, previsao date, condicao_pagamento text, transportadora text, frete numeric(14,2) not null default 0 check(frete>=0), desconto numeric(14,2) not null default 0 check(desconto>=0), observacoes text, valor_total numeric(14,2) not null default 0 check(valor_total>=0),
 aprovado_por uuid references auth.users(id) on update cascade on delete restrict, aprovado_em timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,empresa_id), unique(empresa_id,numero)
);
create table public.pedido_compra_itens (
 id uuid primary key default gen_random_uuid(), pedido_id uuid not null, empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
 produto_id text not null, estoque_id uuid, produto text not null, descricao text, liga text, tempera text, dimensao text,
 peso numeric(14,4) not null default 0 check(peso>=0), quantidade numeric(14,4) not null check(quantidade>0), quantidade_recebida numeric(14,4) not null default 0 check(quantidade_recebida>=0), unidade text not null default 'kg', valor_unitario numeric(14,4) not null check(valor_unitario>=0), subtotal numeric(14,2) not null check(subtotal>=0), comissao numeric(14,2) not null default 0 check(comissao>=0), dados_catalogo jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), check(quantidade_recebida<=quantidade),
 foreign key(pedido_id,empresa_id) references public.pedidos_compra(id,empresa_id) on update cascade on delete restrict,
 foreign key(estoque_id,empresa_id) references public.estoque(id,empresa_id) on update cascade on delete restrict
);
create table public.pedido_compra_cotacoes (
 id uuid primary key default gen_random_uuid(), pedido_id uuid not null, empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict, fornecedor_id text not null,
 fornecedor_snapshot jsonb not null default '{}'::jsonb, valor_total numeric(14,2) not null check(valor_total>=0), prazo_dias integer not null default 0 check(prazo_dias>=0), custo_kg numeric(14,4) not null default 0 check(custo_kg>=0), observacoes text, selecionada boolean not null default false, created_at timestamptz not null default now(),
 foreign key(pedido_id,empresa_id) references public.pedidos_compra(id,empresa_id) on update cascade on delete restrict
);
create table public.pedido_compra_historico (
 id uuid primary key default gen_random_uuid(), pedido_id uuid not null, empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
 tipo text not null check(tipo in ('Criação','Edição','Solicitação','Cotação','Aprovação','Compra','Cancelamento','Recebimento','Estoque','Financeiro')), descricao text not null, created_at timestamptz not null default now(),
 foreign key(pedido_id,empresa_id) references public.pedidos_compra(id,empresa_id) on update cascade on delete restrict
);
create table public.pedido_compra_parcelas (
 id uuid primary key default gen_random_uuid(), pedido_id uuid not null, empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
 numero integer not null check(numero>0), vencimento date not null, valor numeric(14,2) not null check(valor>=0), status text not null default 'Pendente' check(status in ('Pendente','Pago','Cancelado')), created_at timestamptz not null default now(), unique(pedido_id,numero),
 foreign key(pedido_id,empresa_id) references public.pedidos_compra(id,empresa_id) on update cascade on delete restrict
);
create index if not exists pedidos_compra_empresa_status_idx on public.pedidos_compra(empresa_id,status);
create index if not exists pedidos_compra_empresa_data_idx on public.pedidos_compra(empresa_id,data desc);
create index if not exists pedido_itens_pedido_idx on public.pedido_compra_itens(pedido_id);
create index if not exists pedido_cotacoes_pedido_idx on public.pedido_compra_cotacoes(pedido_id,valor_total,prazo_dias);
create index if not exists pedido_historico_pedido_idx on public.pedido_compra_historico(pedido_id,created_at desc);
create index if not exists pedido_parcelas_empresa_vencimento_idx on public.pedido_compra_parcelas(empresa_id,vencimento);
alter table public.pedidos_compra enable row level security;alter table public.pedido_compra_itens enable row level security;alter table public.pedido_compra_cotacoes enable row level security;alter table public.pedido_compra_historico enable row level security;alter table public.pedido_compra_parcelas enable row level security;
create policy "pedidos_compra_empresa" on public.pedidos_compra for select to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedidos_compra.empresa_id));
create policy "pedidos_compra_insert_empresa" on public.pedidos_compra for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedidos_compra.empresa_id));
create policy "pedidos_compra_update_empresa" on public.pedidos_compra for update to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedidos_compra.empresa_id)) with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedidos_compra.empresa_id));
create policy "pedido_itens_empresa" on public.pedido_compra_itens for all to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedido_compra_itens.empresa_id) and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_itens.pedido_id and p.empresa_id=pedido_compra_itens.empresa_id)) with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedido_compra_itens.empresa_id) and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_itens.pedido_id and p.empresa_id=pedido_compra_itens.empresa_id));
create policy "pedido_cotacoes_empresa" on public.pedido_compra_cotacoes for all to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedido_compra_cotacoes.empresa_id) and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_cotacoes.pedido_id and p.empresa_id=pedido_compra_cotacoes.empresa_id)) with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedido_compra_cotacoes.empresa_id) and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_cotacoes.pedido_id and p.empresa_id=pedido_compra_cotacoes.empresa_id));
create policy "pedido_historico_select" on public.pedido_compra_historico for select to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedido_compra_historico.empresa_id) and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_historico.pedido_id and p.empresa_id=pedido_compra_historico.empresa_id));
create policy "pedido_historico_insert" on public.pedido_compra_historico for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedido_compra_historico.empresa_id) and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_historico.pedido_id and p.empresa_id=pedido_compra_historico.empresa_id));
create policy "pedido_parcelas_empresa" on public.pedido_compra_parcelas for all to authenticated using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedido_compra_parcelas.empresa_id) and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_parcelas.pedido_id and p.empresa_id=pedido_compra_parcelas.empresa_id)) with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=pedido_compra_parcelas.empresa_id) and exists(select 1 from public.pedidos_compra p where p.id=pedido_compra_parcelas.pedido_id and p.empresa_id=pedido_compra_parcelas.empresa_id));

create or replace function public.receber_item_pedido(p_item_id uuid,p_empresa_id uuid,p_quantidade numeric)
returns void language plpgsql security invoker set search_path=public as $$
declare v_item public.pedido_compra_itens;v_pedido public.pedidos_compra;v_novo numeric;v_pendentes integer;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade recebida deve ser maior que zero.';end if;
 select * into v_item from public.pedido_compra_itens where id=p_item_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Item não encontrado.';end if;
 select * into v_pedido from public.pedidos_compra where id=v_item.pedido_id and empresa_id=p_empresa_id and status in ('Comprado','Recebido parcialmente') for update;
 if not found then raise exception 'Pedido não está apto para recebimento.';end if;
 if v_item.estoque_id is null then raise exception 'Vincule o item ao estoque antes de receber.';end if;
 v_novo:=v_item.quantidade_recebida+p_quantidade;if v_novo>v_item.quantidade then raise exception 'Recebimento maior que o saldo pendente.';end if;
 perform public.movimentar_estoque(v_item.estoque_id,p_empresa_id,'Entrada',p_quantidade,'Pedido de compra',p_item_id::text||':'||v_novo::text,'Recebimento confirmado do pedido '||v_pedido.numero,null,null);
 update public.pedido_compra_itens set quantidade_recebida=v_novo where id=p_item_id and empresa_id=p_empresa_id;
 select count(*) into v_pendentes from public.pedido_compra_itens where pedido_id=v_pedido.id and empresa_id=p_empresa_id and quantidade_recebida<quantidade;
 update public.pedidos_compra set status=case when v_pendentes=0 then 'Recebido' else 'Recebido parcialmente' end,updated_at=now() where id=v_pedido.id and empresa_id=p_empresa_id;
 insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao) values(v_pedido.id,p_empresa_id,auth.uid(),'Recebimento','Recebimento de '||p_quantidade||' confirmado e enviado ao estoque.');
end $$;
grant select,insert,update on public.pedidos_compra,public.pedido_compra_itens,public.pedido_compra_cotacoes,public.pedido_compra_parcelas to authenticated;
grant select,insert on public.pedido_compra_historico to authenticated;
revoke execute on function public.receber_item_pedido(uuid,uuid,numeric) from public;
grant execute on function public.receber_item_pedido(uuid,uuid,numeric) to authenticated;
comment on table public.pedido_compra_historico is 'Histórico imutável: sem UPDATE ou DELETE para authenticated.';
