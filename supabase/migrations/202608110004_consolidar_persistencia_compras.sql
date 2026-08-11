-- Fase 34: persistência transacional do núcleo de pedidos de compra.
-- Migration exclusivamente local. Não aplicar automaticamente.

create or replace function public.criar_pedido_compra_completo(
  p_empresa_id text,
  p_user_id uuid,
  p_pedido jsonb,
  p_itens jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido_id uuid;
begin
  if p_empresa_id is null or btrim(p_empresa_id) = '' then
    raise exception 'Empresa é obrigatória.';
  end if;
  if p_user_id is distinct from auth.uid() then
    raise exception 'Usuário divergente da sessão autenticada.' using errcode = '42501';
  end if;
  if not exists(select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode = '42501';
  end if;
  if nullif(btrim(p_pedido->>'fornecedor_id'), '') is null or nullif(btrim(p_pedido->>'numero'), '') is null or nullif(p_pedido->>'data', '') is null then
    raise exception 'Fornecedor, número e data são obrigatórios.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido deve possuir ao menos um item válido.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_itens) as i(produto_id text, produto text, quantidade numeric, valor_unitario numeric)
    where nullif(btrim(i.produto_id), '') is null or nullif(btrim(i.produto), '') is null or i.quantidade <= 0 or i.valor_unitario < 0
  ) then
    raise exception 'Há itens inválidos no pedido.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_itens) as i(produto_id text)
    group by i.produto_id having count(*) > 1
  ) then
    raise exception 'O mesmo produto não pode ser duplicado no pedido.';
  end if;

  insert into public.pedidos_compra(
    empresa_id,user_id,fornecedor_id,fornecedor_snapshot,numero,status,data,previsao,
    condicao_pagamento,transportadora,frete,desconto,observacoes,valor_total
  ) values (
    p_empresa_id,p_user_id,p_pedido->>'fornecedor_id',coalesce(p_pedido->'fornecedor_snapshot','{}'::jsonb),
    p_pedido->>'numero',coalesce(nullif(p_pedido->>'status',''),'Rascunho'),(p_pedido->>'data')::date,
    nullif(p_pedido->>'previsao','')::date,nullif(p_pedido->>'condicao_pagamento',''),nullif(p_pedido->>'transportadora',''),
    coalesce((p_pedido->>'frete')::numeric,0),coalesce((p_pedido->>'desconto')::numeric,0),nullif(p_pedido->>'observacoes',''),
    coalesce((p_pedido->>'valor_total')::numeric,0)
  ) returning id into v_pedido_id;

  insert into public.pedido_compra_itens(
    pedido_id,empresa_id,produto_id,estoque_id,produto,descricao,liga,tempera,dimensao,peso,
    quantidade,unidade,valor_unitario,subtotal,comissao,dados_catalogo
  )
  select v_pedido_id,p_empresa_id,i.produto_id,nullif(i.estoque_id,'')::uuid,i.produto,i.descricao,i.liga,i.tempera,i.dimensao,
    coalesce(i.peso,0),i.quantidade,coalesce(nullif(i.unidade,''),'kg'),i.valor_unitario,i.subtotal,coalesce(i.comissao,0),coalesce(i.dados_catalogo,'{}'::jsonb)
  from jsonb_to_recordset(p_itens) as i(
    produto_id text,estoque_id text,produto text,descricao text,liga text,tempera text,dimensao text,peso numeric,
    quantidade numeric,unidade text,valor_unitario numeric,subtotal numeric,comissao numeric,dados_catalogo jsonb
  );

  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(v_pedido_id,p_empresa_id,p_user_id,'Criação','Pedido, itens e histórico criados em uma única transação.');
  return v_pedido_id;
end $$;

create or replace function public.atualizar_pedido_compra_completo(
  p_pedido_id uuid,
  p_empresa_id text,
  p_user_id uuid,
  p_pedido jsonb,
  p_itens jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido public.pedidos_compra;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Usuário divergente da sessão autenticada.' using errcode = '42501';
  end if;
  if not exists(select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode = '42501';
  end if;
  select * into v_pedido from public.pedidos_compra where id = p_pedido_id and empresa_id = p_empresa_id for update;
  if not found then
    raise exception 'Pedido não encontrado para a empresa atual.';
  end if;
  if exists(select 1 from public.pedido_compra_itens where pedido_id = p_pedido_id and empresa_id = p_empresa_id and quantidade_recebida > 0) then
    raise exception 'Pedido com recebimento não pode ter seus itens reeditados.';
  end if;
  if nullif(btrim(p_pedido->>'fornecedor_id'), '') is null or nullif(btrim(p_pedido->>'numero'), '') is null or nullif(p_pedido->>'data', '') is null then
    raise exception 'Fornecedor, número e data são obrigatórios.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido deve possuir ao menos um item válido.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_itens) as i(produto_id text, produto text, quantidade numeric, valor_unitario numeric)
    where nullif(btrim(i.produto_id), '') is null or nullif(btrim(i.produto), '') is null or i.quantidade <= 0 or i.valor_unitario < 0
  ) then
    raise exception 'Há itens inválidos no pedido.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_itens) as i(produto_id text)
    group by i.produto_id having count(*) > 1
  ) then
    raise exception 'O mesmo produto não pode ser duplicado no pedido.';
  end if;

  update public.pedidos_compra set
    fornecedor_id=p_pedido->>'fornecedor_id',fornecedor_snapshot=coalesce(p_pedido->'fornecedor_snapshot','{}'::jsonb),
    numero=p_pedido->>'numero',status=coalesce(nullif(p_pedido->>'status',''),'Rascunho'),data=(p_pedido->>'data')::date,
    previsao=nullif(p_pedido->>'previsao','')::date,condicao_pagamento=nullif(p_pedido->>'condicao_pagamento',''),
    transportadora=nullif(p_pedido->>'transportadora',''),frete=coalesce((p_pedido->>'frete')::numeric,0),
    desconto=coalesce((p_pedido->>'desconto')::numeric,0),observacoes=nullif(p_pedido->>'observacoes',''),
    valor_total=coalesce((p_pedido->>'valor_total')::numeric,0),updated_at=now()
  where id=p_pedido_id and empresa_id=p_empresa_id;

  delete from public.pedido_compra_itens where pedido_id=p_pedido_id and empresa_id=p_empresa_id;
  insert into public.pedido_compra_itens(
    pedido_id,empresa_id,produto_id,estoque_id,produto,descricao,liga,tempera,dimensao,peso,
    quantidade,unidade,valor_unitario,subtotal,comissao,dados_catalogo
  )
  select p_pedido_id,p_empresa_id,i.produto_id,nullif(i.estoque_id,'')::uuid,i.produto,i.descricao,i.liga,i.tempera,i.dimensao,
    coalesce(i.peso,0),i.quantidade,coalesce(nullif(i.unidade,''),'kg'),i.valor_unitario,i.subtotal,coalesce(i.comissao,0),coalesce(i.dados_catalogo,'{}'::jsonb)
  from jsonb_to_recordset(p_itens) as i(
    produto_id text,estoque_id text,produto text,descricao text,liga text,tempera text,dimensao text,peso numeric,
    quantidade numeric,unidade text,valor_unitario numeric,subtotal numeric,comissao numeric,dados_catalogo jsonb
  );

  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(p_pedido_id,p_empresa_id,p_user_id,'Edição','Cabeçalho e itens sincronizados em uma única transação.');
  return p_pedido_id;
end $$;

grant execute on function public.criar_pedido_compra_completo(text,uuid,jsonb,jsonb) to authenticated;
grant execute on function public.atualizar_pedido_compra_completo(uuid,text,uuid,jsonb,jsonb) to authenticated;

comment on function public.criar_pedido_compra_completo(text,uuid,jsonb,jsonb) is 'Cria pedido, itens e histórico atomicamente, sem estoque ou financeiro.';
comment on function public.atualizar_pedido_compra_completo(uuid,text,uuid,jsonb,jsonb) is 'Sincroniza cabeçalho e itens sem recebimento, preservando histórico.';
