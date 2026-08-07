create table if not exists public.estoque (
  id uuid primary key default gen_random_uuid(), empresa_id text not null, produto_id text, codigo text not null, descricao text not null,
  categoria text, liga text, tempera text, dimensao text, peso_unitario numeric(14,4) not null default 0 check (peso_unitario >= 0), unidade text not null default 'kg',
  estoque_atual numeric(14,4) not null default 0 check (estoque_atual >= 0), estoque_reservado numeric(14,4) not null default 0 check (estoque_reservado >= 0),
  estoque_disponivel numeric(14,4) generated always as (estoque_atual - estoque_reservado) stored,
  estoque_minimo numeric(14,4) not null default 0 check (estoque_minimo >= 0), estoque_maximo numeric(14,4) check (estoque_maximo is null or estoque_maximo >= estoque_minimo),
  ponto_reposicao numeric(14,4) not null default 0 check (ponto_reposicao >= 0), localizacao text, observacoes text,
  custo_unitario numeric(14,4) not null default 0 check (custo_unitario >= 0), prazo_reposicao_dias integer not null default 0 check (prazo_reposicao_dias >= 0),
  ultima_movimentacao_em timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (empresa_id, codigo), check (estoque_reservado <= estoque_atual)
);

create table if not exists public.estoque_movimentacoes (
  id uuid primary key default gen_random_uuid(), empresa_id text not null, estoque_id uuid not null references public.estoque(id) on update cascade on delete restrict,
  produto_id text, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check (tipo in ('Entrada','Saída','Transferência','Reserva','Liberação','Ajuste','Inventário','Reversão')),
  origem text not null, origem_id text, quantidade numeric(14,4) not null check (quantidade >= 0), saldo_anterior numeric(14,4) not null,
  saldo_posterior numeric(14,4) not null, reservado_anterior numeric(14,4) not null, reservado_posterior numeric(14,4) not null,
  localizacao_origem text, localizacao_destino text, observacoes text, reversao_de uuid references public.estoque_movimentacoes(id) on update cascade on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.inventarios (
  id uuid primary key default gen_random_uuid(), empresa_id text not null, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  numero text not null, status text not null default 'Em contagem' check (status in ('Em contagem','Conferido','Ajustado','Cancelado')),
  data_inicio timestamptz not null default now(), data_conclusao timestamptz, observacoes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (empresa_id, numero)
);

create table if not exists public.inventario_itens (
  id uuid primary key default gen_random_uuid(), inventario_id uuid not null references public.inventarios(id) on update cascade on delete restrict,
  empresa_id text not null, estoque_id uuid not null references public.estoque(id) on update cascade on delete restrict,
  quantidade_sistema numeric(14,4) not null, quantidade_contada numeric(14,4), diferenca numeric(14,4) generated always as (quantidade_contada - quantidade_sistema) stored,
  observacoes text, created_at timestamptz not null default now(), unique (inventario_id, estoque_id)
);

create index if not exists estoque_empresa_descricao_idx on public.estoque (empresa_id, descricao);
create index if not exists estoque_empresa_disponivel_idx on public.estoque (empresa_id, estoque_disponivel);
create index if not exists estoque_mov_empresa_data_idx on public.estoque_movimentacoes (empresa_id, created_at desc);
create index if not exists estoque_mov_item_data_idx on public.estoque_movimentacoes (estoque_id, created_at desc);
create unique index if not exists estoque_mov_reversao_unica_idx on public.estoque_movimentacoes (reversao_de) where reversao_de is not null;
create unique index if not exists estoque_mov_operacao_unica_idx on public.estoque_movimentacoes (empresa_id,tipo,origem,origem_id) where origem_id is not null and tipo in ('Entrada','Saída');
create index if not exists inventarios_empresa_data_idx on public.inventarios (empresa_id, data_inicio desc);

alter table public.estoque enable row level security; alter table public.estoque_movimentacoes enable row level security;
alter table public.inventarios enable row level security; alter table public.inventario_itens enable row level security;

create policy "estoque_empresa" on public.estoque for all to authenticated using (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=estoque.empresa_id)) with check (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=estoque.empresa_id));
create policy "estoque_mov_select" on public.estoque_movimentacoes for select to authenticated using (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=estoque_movimentacoes.empresa_id));
create policy "estoque_mov_insert" on public.estoque_movimentacoes for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=estoque_movimentacoes.empresa_id));
create policy "inventarios_select_empresa" on public.inventarios for select to authenticated using (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=inventarios.empresa_id));
create policy "inventarios_insert_empresa" on public.inventarios for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=inventarios.empresa_id));
create policy "inventarios_update_empresa" on public.inventarios for update to authenticated using (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=inventarios.empresa_id)) with check (exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=inventarios.empresa_id));
create policy "inventario_itens_empresa" on public.inventario_itens for all to authenticated using (exists(select 1 from public.inventarios i where i.id=inventario_itens.inventario_id and i.empresa_id=inventario_itens.empresa_id)) with check (exists(select 1 from public.inventarios i where i.id=inventario_itens.inventario_id and i.empresa_id=inventario_itens.empresa_id));

create or replace function public.movimentar_estoque(p_estoque_id uuid,p_empresa_id text,p_tipo text,p_quantidade numeric,p_origem text,p_origem_id text default null,p_observacoes text default null,p_localizacao_destino text default null,p_reversao_de uuid default null)
returns public.estoque language plpgsql security invoker set search_path=public as $$
declare v_item public.estoque; v_original public.estoque_movimentacoes; v_atual numeric; v_reservado numeric; v_saldo_anterior numeric; v_reservado_anterior numeric;
begin
  if p_quantidade<0 or (p_quantidade=0 and p_tipo not in ('Ajuste','Inventário')) then raise exception 'Quantidade inválida.'; end if;
  select * into v_item from public.estoque where id=p_estoque_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Item de estoque não encontrado.'; end if;
  v_atual:=v_item.estoque_atual; v_reservado:=v_item.estoque_reservado; v_saldo_anterior:=v_atual; v_reservado_anterior:=v_reservado;
  case p_tipo
    when 'Entrada' then v_atual:=v_atual+p_quantidade;
    when 'Saída' then if v_atual-v_reservado<p_quantidade then raise exception 'Saldo disponível insuficiente.'; end if; v_atual:=v_atual-p_quantidade;
    when 'Reserva' then if v_atual-v_reservado<p_quantidade then raise exception 'Saldo disponível insuficiente para reserva.'; end if; v_reservado:=v_reservado+p_quantidade;
    when 'Liberação' then if v_reservado<p_quantidade then raise exception 'Reserva insuficiente.'; end if; v_reservado:=v_reservado-p_quantidade;
    when 'Ajuste' then v_atual:=p_quantidade; if v_atual<v_reservado then raise exception 'Ajuste menor que o saldo reservado.'; end if;
    when 'Inventário' then v_atual:=p_quantidade; if v_atual<v_reservado then raise exception 'Contagem menor que o saldo reservado.'; end if;
    when 'Transferência' then null;
    when 'Reversão' then
      if p_reversao_de is null then raise exception 'Movimentação original obrigatória.'; end if;
      select * into v_original from public.estoque_movimentacoes where id=p_reversao_de and estoque_id=p_estoque_id and empresa_id=p_empresa_id;
      if not found or v_original.tipo='Reversão' then raise exception 'Movimentação original inválida.'; end if;
      if exists(select 1 from public.estoque_movimentacoes where reversao_de=p_reversao_de) then raise exception 'Movimentação já revertida.'; end if;
      case v_original.tipo when 'Entrada' then if v_atual-v_reservado<v_original.quantidade then raise exception 'Saldo insuficiente para reverter entrada.'; end if; v_atual:=v_atual-v_original.quantidade;
        when 'Saída' then v_atual:=v_atual+v_original.quantidade;
        when 'Reserva' then if v_reservado<v_original.quantidade then raise exception 'Reserva insuficiente para reversão.'; end if; v_reservado:=v_reservado-v_original.quantidade;
        when 'Liberação' then if v_atual-v_reservado<v_original.quantidade then raise exception 'Saldo insuficiente para restaurar reserva.'; end if; v_reservado:=v_reservado+v_original.quantidade;
        else raise exception 'Este tipo deve ser corrigido por nova movimentação de ajuste.'; end case;
    else raise exception 'Tipo de movimentação inválido.';
  end case;
  update public.estoque set estoque_atual=v_atual,estoque_reservado=v_reservado,localizacao=coalesce(p_localizacao_destino,localizacao),ultima_movimentacao_em=now(),updated_at=now() where id=v_item.id returning * into v_item;
  insert into public.estoque_movimentacoes(empresa_id,estoque_id,produto_id,user_id,tipo,origem,origem_id,quantidade,saldo_anterior,saldo_posterior,reservado_anterior,reservado_posterior,localizacao_origem,localizacao_destino,observacoes,reversao_de)
  values(p_empresa_id,v_item.id,v_item.produto_id,auth.uid(),p_tipo,p_origem,p_origem_id,p_quantidade,v_saldo_anterior,v_item.estoque_atual,v_reservado_anterior,v_item.estoque_reservado,v_item.localizacao,p_localizacao_destino,p_observacoes,p_reversao_de);
  return v_item;
end $$;

create or replace function public.finalizar_inventario(p_inventario_id uuid,p_empresa_id text)
returns void language plpgsql security invoker set search_path=public as $$
declare v_inventario public.inventarios; v_item public.inventario_itens;
begin
  select * into v_inventario from public.inventarios where id=p_inventario_id and empresa_id=p_empresa_id and status='Em contagem' for update;
  if not found then raise exception 'Inventário aberto não encontrado.'; end if;
  if exists(select 1 from public.inventario_itens where inventario_id=p_inventario_id and quantidade_contada is null) then raise exception 'Todas as contagens devem ser informadas.'; end if;
  for v_item in select * from public.inventario_itens where inventario_id=p_inventario_id and diferenca<>0 loop
    perform public.movimentar_estoque(v_item.estoque_id,p_empresa_id,'Inventário',v_item.quantidade_contada,'Inventário',p_inventario_id::text,'Ajuste após contagem confirmada.',null,null);
  end loop;
  update public.inventarios set status='Ajustado',data_conclusao=now(),updated_at=now() where id=p_inventario_id;
end $$;

create or replace function public.baixar_reserva_estoque(p_estoque_id uuid,p_empresa_id text,p_quantidade numeric,p_venda_id text,p_orcamento_id text)
returns void language plpgsql security invoker set search_path=public as $$
begin
  perform public.movimentar_estoque(p_estoque_id,p_empresa_id,'Liberação',p_quantidade,'Orçamento',p_orcamento_id,'Reserva convertida em venda.',null,null);
  perform public.movimentar_estoque(p_estoque_id,p_empresa_id,'Saída',p_quantidade,'Venda',p_venda_id,'Baixa de reserva após venda confirmada.',null,null);
end $$;

grant select,insert,update on public.estoque to authenticated; grant select,insert on public.estoque_movimentacoes to authenticated;
grant select,insert,update on public.inventarios to authenticated; grant select,insert,update on public.inventario_itens to authenticated;
grant execute on function public.movimentar_estoque(uuid,text,text,numeric,text,text,text,text,uuid) to authenticated;
grant execute on function public.finalizar_inventario(uuid,text) to authenticated;
grant execute on function public.baixar_reserva_estoque(uuid,text,numeric,text,text) to authenticated;
comment on table public.estoque_movimentacoes is 'Histórico imutável: não conceder UPDATE ou DELETE.';
