create table if not exists public.financeiro_titulos (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check (tipo in ('Pagar','Receber')),
  contraparte_id text,
  contraparte_nome text not null,
  origem text not null check (origem in ('Compra','Venda','Orçamento','Despesa','Manual','Imposto','Serviço','Outro')),
  origem_id text,
  referencia text,
  descricao text not null,
  categoria text,
  centro_custo text,
  vencimento date not null,
  valor_original numeric(14,2) not null check (valor_original > 0),
  valor_baixado numeric(14,2) not null default 0 check (valor_baixado >= 0 and valor_baixado <= valor_original),
  saldo numeric(14,2) generated always as (valor_original - valor_baixado) stored,
  status text not null default 'Pendente' check (status in ('Pendente','Parcial','Liquidado','Cancelado')),
  data_liquidacao date,
  forma_pagamento text,
  conta text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, tipo, origem, origem_id)
);

create table if not exists public.financeiro_baixas (
  id uuid primary key default gen_random_uuid(),
  titulo_id uuid not null references public.financeiro_titulos(id) on update cascade on delete restrict,
  empresa_id text not null,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check (tipo in ('Baixa','Estorno')),
  valor numeric(14,2) not null check (valor > 0),
  valor_baixado_anterior numeric(14,2) not null check (valor_baixado_anterior >= 0),
  valor_baixado_resultante numeric(14,2) not null check (valor_baixado_resultante >= 0),
  saldo_resultante numeric(14,2) not null check (saldo_resultante >= 0),
  data_movimento date not null default current_date,
  forma_pagamento text,
  conta text,
  observacoes text,
  estorno_de uuid references public.financeiro_baixas(id) on update cascade on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists financeiro_baixas_estorno_unico_idx
  on public.financeiro_baixas(estorno_de) where estorno_de is not null;

create table if not exists public.financeiro_conciliacoes (
  id uuid primary key default gen_random_uuid(),
  titulo_id uuid references public.financeiro_titulos(id) on update cascade on delete restrict,
  baixa_id uuid references public.financeiro_baixas(id) on update cascade on delete restrict,
  empresa_id text not null,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  conta text not null,
  data_movimento date not null,
  valor numeric(14,2) not null check (valor > 0),
  status text not null default 'Pendente' check (status in ('Pendente','Conciliado','Divergente')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (titulo_id is not null or baixa_id is not null)
);

create table if not exists public.financeiro_historico (
  id uuid primary key default gen_random_uuid(),
  titulo_id uuid not null references public.financeiro_titulos(id) on update cascade on delete restrict,
  empresa_id text not null,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check (tipo in ('Criação','Edição','Baixa','Baixa parcial','Estorno','Conciliação','Vencimento','Integração')),
  descricao text not null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists financeiro_titulos_empresa_tipo_status_idx on public.financeiro_titulos(empresa_id,tipo,status);
create index if not exists financeiro_titulos_empresa_vencimento_idx on public.financeiro_titulos(empresa_id,vencimento);
create index if not exists financeiro_titulos_origem_idx on public.financeiro_titulos(empresa_id,origem,origem_id) where origem_id is not null;
create index if not exists financeiro_baixas_empresa_data_idx on public.financeiro_baixas(empresa_id,data_movimento desc);
create index if not exists financeiro_baixas_titulo_idx on public.financeiro_baixas(titulo_id,created_at desc);
create index if not exists financeiro_conciliacoes_empresa_status_idx on public.financeiro_conciliacoes(empresa_id,status,data_movimento desc);
create index if not exists financeiro_historico_titulo_idx on public.financeiro_historico(titulo_id,created_at desc);

alter table public.financeiro_titulos enable row level security;
alter table public.financeiro_baixas enable row level security;
alter table public.financeiro_conciliacoes enable row level security;
alter table public.financeiro_historico enable row level security;

create policy "financeiro_titulos_select_empresa" on public.financeiro_titulos for select to authenticated
  using (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=financeiro_titulos.empresa_id));
create policy "financeiro_titulos_insert_empresa" on public.financeiro_titulos for insert to authenticated
  with check (user_id=auth.uid() and exists (select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=financeiro_titulos.empresa_id));
create policy "financeiro_titulos_update_empresa" on public.financeiro_titulos for update to authenticated
  using (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=financeiro_titulos.empresa_id))
  with check (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=financeiro_titulos.empresa_id));

create policy "financeiro_baixas_select_empresa" on public.financeiro_baixas for select to authenticated
  using (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=financeiro_baixas.empresa_id));
create policy "financeiro_conciliacoes_empresa" on public.financeiro_conciliacoes for all to authenticated
  using (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=financeiro_conciliacoes.empresa_id))
  with check (user_id=auth.uid() and exists (select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=financeiro_conciliacoes.empresa_id));
create policy "financeiro_historico_select_empresa" on public.financeiro_historico for select to authenticated
  using (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=financeiro_historico.empresa_id));

create or replace function public.registrar_titulo_financeiro(
  p_empresa_id text,p_tipo text,p_contraparte_nome text,p_origem text,p_origem_id text,p_referencia text,
  p_descricao text,p_vencimento date,p_valor numeric,p_contraparte_id text default null,p_categoria text default null,
  p_centro_custo text default null,p_observacoes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=p_empresa_id) then raise exception 'Acesso negado à empresa.'; end if;
  if p_valor<=0 then raise exception 'O valor deve ser maior que zero.'; end if;
  insert into public.financeiro_titulos(empresa_id,user_id,tipo,contraparte_id,contraparte_nome,origem,origem_id,referencia,descricao,categoria,centro_custo,vencimento,valor_original,observacoes)
  values(p_empresa_id,auth.uid(),p_tipo,p_contraparte_id,p_contraparte_nome,p_origem,p_origem_id,p_referencia,p_descricao,p_categoria,p_centro_custo,p_vencimento,p_valor,p_observacoes)
  on conflict(empresa_id,tipo,origem,origem_id) do nothing returning id into v_id;
  if v_id is null then raise exception 'Já existe um título para esta origem.'; end if;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados)
  values(v_id,p_empresa_id,auth.uid(),case when p_origem='Manual' then 'Criação' else 'Integração' end,'Título financeiro registrado.',jsonb_build_object('origem',p_origem,'origem_id',p_origem_id));
  return v_id;
end $$;

create or replace function public.baixar_titulo_financeiro(
  p_titulo_id uuid,p_empresa_id text,p_valor numeric,p_data date,p_forma text,p_conta text,p_observacoes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_titulo public.financeiro_titulos;v_novo numeric;v_baixa uuid;v_tipo text;
begin
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=p_empresa_id) then raise exception 'Acesso negado à empresa.'; end if;
  select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id for update;
  if not found or v_titulo.status='Cancelado' then raise exception 'Título não encontrado ou cancelado.'; end if;
  if p_valor<=0 or p_valor>v_titulo.saldo then raise exception 'Valor de baixa inválido.'; end if;
  v_novo:=v_titulo.valor_baixado+p_valor;v_tipo:=case when v_novo<v_titulo.valor_original then 'Baixa parcial' else 'Baixa' end;
  update public.financeiro_titulos set valor_baixado=v_novo,status=case when v_novo=v_titulo.valor_original then 'Liquidado' else 'Parcial' end,data_liquidacao=case when v_novo=v_titulo.valor_original then p_data else null end,forma_pagamento=p_forma,conta=p_conta,updated_at=now() where id=p_titulo_id;
  insert into public.financeiro_baixas(titulo_id,empresa_id,user_id,tipo,valor,valor_baixado_anterior,valor_baixado_resultante,saldo_resultante,data_movimento,forma_pagamento,conta,observacoes)
  values(p_titulo_id,p_empresa_id,auth.uid(),'Baixa',p_valor,v_titulo.valor_baixado,v_novo,v_titulo.valor_original-v_novo,p_data,p_forma,p_conta,p_observacoes) returning id into v_baixa;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(p_titulo_id,p_empresa_id,auth.uid(),v_tipo,'Baixa financeira registrada.',jsonb_build_object('baixa_id',v_baixa,'valor',p_valor,'saldo',v_titulo.valor_original-v_novo));
  return v_baixa;
end $$;

create or replace function public.editar_titulo_financeiro(
  p_titulo_id uuid,p_empresa_id text,p_contraparte_nome text,p_referencia text,p_descricao text,
  p_categoria text,p_centro_custo text,p_vencimento date,p_observacoes text default null
) returns void language plpgsql security definer set search_path=public as $$
declare v_titulo public.financeiro_titulos;v_tipo text;
begin
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=p_empresa_id) then raise exception 'Acesso negado à empresa.'; end if;
  select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id for update;
  if not found or v_titulo.status='Cancelado' then raise exception 'Título não encontrado ou cancelado.'; end if;
  v_tipo:=case when v_titulo.vencimento<>p_vencimento then 'Vencimento' else 'Edição' end;
  update public.financeiro_titulos set contraparte_nome=p_contraparte_nome,referencia=p_referencia,descricao=p_descricao,
    categoria=p_categoria,centro_custo=p_centro_custo,vencimento=p_vencimento,observacoes=p_observacoes,updated_at=now() where id=p_titulo_id;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados)
  values(p_titulo_id,p_empresa_id,auth.uid(),v_tipo,'Dados do título financeiro editados.',jsonb_build_object('vencimento_anterior',v_titulo.vencimento,'vencimento_novo',p_vencimento));
end $$;

create or replace function public.conciliar_titulo_financeiro(
  p_titulo_id uuid,p_empresa_id text,p_conta text,p_data date,p_valor numeric,p_status text,p_observacoes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_titulo public.financeiro_titulos;v_id uuid;
begin
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=p_empresa_id) then raise exception 'Acesso negado à empresa.'; end if;
  select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id;
  if not found then raise exception 'Título não encontrado.'; end if;
  if p_valor<=0 or p_status not in ('Pendente','Conciliado','Divergente') then raise exception 'Dados de conciliação inválidos.'; end if;
  insert into public.financeiro_conciliacoes(titulo_id,empresa_id,user_id,conta,data_movimento,valor,status,observacoes)
  values(p_titulo_id,p_empresa_id,auth.uid(),p_conta,p_data,p_valor,p_status,p_observacoes) returning id into v_id;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados)
  values(p_titulo_id,p_empresa_id,auth.uid(),'Conciliação','Conciliação manual registrada.',jsonb_build_object('conciliacao_id',v_id,'status',p_status,'conta',p_conta,'valor',p_valor));
  return v_id;
end $$;

create or replace function public.estornar_baixa_financeira(
  p_baixa_id uuid,p_empresa_id text,p_data date,p_observacoes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_baixa public.financeiro_baixas;v_titulo public.financeiro_titulos;v_novo numeric;v_estorno uuid;
begin
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id::text=p_empresa_id) then raise exception 'Acesso negado à empresa.'; end if;
  select * into v_baixa from public.financeiro_baixas where id=p_baixa_id and empresa_id=p_empresa_id and tipo='Baixa' for update;
  if not found or exists(select 1 from public.financeiro_baixas where estorno_de=p_baixa_id) then raise exception 'Baixa inexistente ou já estornada.'; end if;
  select * into v_titulo from public.financeiro_titulos where id=v_baixa.titulo_id and empresa_id=p_empresa_id for update;
  v_novo:=v_titulo.valor_baixado-v_baixa.valor;if v_novo<0 then raise exception 'Estorno inconsistente.';end if;
  update public.financeiro_titulos set valor_baixado=v_novo,status=case when v_novo=0 then 'Pendente' else 'Parcial' end,data_liquidacao=null,updated_at=now() where id=v_titulo.id;
  insert into public.financeiro_baixas(titulo_id,empresa_id,user_id,tipo,valor,valor_baixado_anterior,valor_baixado_resultante,saldo_resultante,data_movimento,forma_pagamento,conta,observacoes,estorno_de)
  values(v_titulo.id,p_empresa_id,auth.uid(),'Estorno',v_baixa.valor,v_titulo.valor_baixado,v_novo,v_titulo.valor_original-v_novo,p_data,v_baixa.forma_pagamento,v_baixa.conta,p_observacoes,p_baixa_id) returning id into v_estorno;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(v_titulo.id,p_empresa_id,auth.uid(),'Estorno','Baixa financeira estornada sem exclusão do histórico.',jsonb_build_object('baixa_id',p_baixa_id,'estorno_id',v_estorno,'valor',v_baixa.valor));
  return v_estorno;
end $$;

grant select on public.financeiro_titulos,public.financeiro_baixas,public.financeiro_historico to authenticated;
grant select on public.financeiro_conciliacoes to authenticated;
revoke execute on function public.registrar_titulo_financeiro(text,text,text,text,text,text,text,date,numeric,text,text,text,text) from public;
revoke execute on function public.baixar_titulo_financeiro(uuid,text,numeric,date,text,text,text) from public;
revoke execute on function public.editar_titulo_financeiro(uuid,text,text,text,text,text,text,date,text) from public;
revoke execute on function public.conciliar_titulo_financeiro(uuid,text,text,date,numeric,text,text) from public;
revoke execute on function public.estornar_baixa_financeira(uuid,text,date,text) from public;
grant execute on function public.registrar_titulo_financeiro(text,text,text,text,text,text,text,date,numeric,text,text,text,text) to authenticated;
grant execute on function public.baixar_titulo_financeiro(uuid,text,numeric,date,text,text,text) to authenticated;
grant execute on function public.editar_titulo_financeiro(uuid,text,text,text,text,text,text,date,text) to authenticated;
grant execute on function public.conciliar_titulo_financeiro(uuid,text,text,date,numeric,text,text) to authenticated;
grant execute on function public.estornar_baixa_financeira(uuid,text,date,text) to authenticated;

comment on table public.financeiro_baixas is 'Eventos financeiros imutáveis: baixas e estornos não recebem UPDATE ou DELETE por authenticated.';
comment on table public.financeiro_historico is 'Histórico financeiro imutável e multiempresa.';
comment on function public.registrar_titulo_financeiro is 'Registro confirmado pelo usuário, com isolamento por empresa e deduplicação por origem.';
