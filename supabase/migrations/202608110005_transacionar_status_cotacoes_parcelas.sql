-- Fase 35: status, cotações e parcelas com histórico na mesma transação.
-- Migration exclusivamente local. Não aplicar automaticamente.

create or replace function public.alterar_status_pedido_compra(
  p_pedido_id uuid,
  p_empresa_id uuid,
  p_user_id uuid,
  p_novo_status text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido public.pedidos_compra;
  v_tipo text;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Usuário divergente da sessão autenticada.' using errcode='42501'; end if;
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode='42501';
  end if;
  select * into v_pedido from public.pedidos_compra where id=p_pedido_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Pedido não encontrado para a empresa atual.'; end if;
  if not (case v_pedido.status
    when 'Rascunho' then p_novo_status in ('Solicitado','Cancelado')
    when 'Solicitado' then p_novo_status in ('Rascunho','Em cotação','Cancelado')
    when 'Em cotação' then p_novo_status in ('Solicitado','Aprovado','Cancelado')
    when 'Aprovado' then p_novo_status in ('Em cotação','Comprado','Cancelado')
    when 'Comprado' then p_novo_status='Cancelado'
    else false end) then
    raise exception 'Transição de status não permitida: % para %.',v_pedido.status,p_novo_status;
  end if;

  update public.pedidos_compra set status=p_novo_status,updated_at=now(),
    aprovado_por=case when p_novo_status='Aprovado' then p_user_id else aprovado_por end,
    aprovado_em=case when p_novo_status='Aprovado' then now() else aprovado_em end
  where id=p_pedido_id and empresa_id=p_empresa_id;
  v_tipo:=case p_novo_status when 'Solicitado' then 'Solicitação' when 'Em cotação' then 'Cotação' when 'Aprovado' then 'Aprovação' when 'Comprado' then 'Compra' when 'Cancelado' then 'Cancelamento' else 'Edição' end;
  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(p_pedido_id,p_empresa_id,p_user_id,v_tipo,'Status alterado de '||v_pedido.status||' para '||p_novo_status||'.');
end $$;

create or replace function public.salvar_cotacao_pedido_compra(
  p_cotacao_id uuid,
  p_pedido_id uuid,
  p_empresa_id uuid,
  p_user_id uuid,
  p_cotacao jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cotacao_id uuid;
  v_fornecedor_id text:=nullif(btrim(p_cotacao->>'fornecedor_id'),'');
  v_acao text;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Usuário divergente da sessão autenticada.' using errcode='42501'; end if;
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode='42501';
  end if;
  perform 1 from public.pedidos_compra where id=p_pedido_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Pedido não encontrado para a empresa atual.'; end if;
  if v_fornecedor_id is null then raise exception 'Fornecedor da cotação é obrigatório.'; end if;
  if coalesce((p_cotacao->>'valor_total')::numeric,-1)<0 or coalesce((p_cotacao->>'prazo_dias')::integer,-1)<0 or coalesce((p_cotacao->>'custo_kg')::numeric,-1)<0 then
    raise exception 'Valores e prazo da cotação devem ser maiores ou iguais a zero.';
  end if;

  if p_cotacao_id is not null then
    select id into v_cotacao_id from public.pedido_compra_cotacoes where id=p_cotacao_id and pedido_id=p_pedido_id and empresa_id=p_empresa_id for update;
    if not found then raise exception 'Cotação não encontrada para este pedido.'; end if;
  else
    select id into v_cotacao_id from public.pedido_compra_cotacoes where pedido_id=p_pedido_id and empresa_id=p_empresa_id and fornecedor_id=v_fornecedor_id order by created_at desc limit 1 for update;
  end if;

  if v_cotacao_id is null then
    insert into public.pedido_compra_cotacoes(pedido_id,empresa_id,fornecedor_id,fornecedor_snapshot,valor_total,prazo_dias,custo_kg,observacoes)
    values(p_pedido_id,p_empresa_id,v_fornecedor_id,coalesce(p_cotacao->'fornecedor_snapshot','{}'::jsonb),(p_cotacao->>'valor_total')::numeric,(p_cotacao->>'prazo_dias')::integer,(p_cotacao->>'custo_kg')::numeric,nullif(p_cotacao->>'observacoes',''))
    returning id into v_cotacao_id;
    v_acao:='criada';
  else
    update public.pedido_compra_cotacoes set fornecedor_id=v_fornecedor_id,fornecedor_snapshot=coalesce(p_cotacao->'fornecedor_snapshot','{}'::jsonb),
      valor_total=(p_cotacao->>'valor_total')::numeric,prazo_dias=(p_cotacao->>'prazo_dias')::integer,custo_kg=(p_cotacao->>'custo_kg')::numeric,observacoes=nullif(p_cotacao->>'observacoes','')
    where id=v_cotacao_id and pedido_id=p_pedido_id and empresa_id=p_empresa_id;
    v_acao:='atualizada';
  end if;
  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(p_pedido_id,p_empresa_id,p_user_id,'Cotação','Cotação do fornecedor '||v_fornecedor_id||' '||v_acao||' em uma única transação.');
  return v_cotacao_id;
end $$;

create or replace function public.sincronizar_parcelas_pedido_compra(
  p_pedido_id uuid,
  p_empresa_id uuid,
  p_user_id uuid,
  p_parcelas jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido public.pedidos_compra;
  v_quantidade integer;
  v_soma numeric;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Usuário divergente da sessão autenticada.' using errcode='42501'; end if;
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode='42501';
  end if;
  select * into v_pedido from public.pedidos_compra where id=p_pedido_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Pedido não encontrado para a empresa atual.'; end if;
  if v_pedido.status not in ('Aprovado','Comprado') then raise exception 'Parcelas só podem ser preparadas para pedido aprovado ou comprado.'; end if;
  if jsonb_typeof(p_parcelas) is distinct from 'array' or jsonb_array_length(p_parcelas)=0 then raise exception 'Informe ao menos uma parcela.'; end if;
  if exists(select 1 from public.pedido_compra_parcelas where pedido_id=p_pedido_id and empresa_id=p_empresa_id and status<>'Pendente') then
    raise exception 'Parcelas processadas não podem ser substituídas.';
  end if;
  if exists(
    select 1 from public.pedido_compra_parcelas pc
    join public.financeiro_titulos ft on ft.empresa_id=p_empresa_id and ft.empresa_id=pc.empresa_id and ft.origem='Compra' and ft.origem_id='parcela:'||pc.id::text
    where pc.pedido_id=p_pedido_id and pc.empresa_id=p_empresa_id
  ) then
    raise exception 'Parcelas já vinculadas a títulos financeiros não podem ser substituídas.';
  end if;

  select count(*),coalesce(sum(p.valor),0) into v_quantidade,v_soma
  from jsonb_to_recordset(p_parcelas) as p(numero integer,vencimento date,valor numeric);
  if exists(select 1 from jsonb_to_recordset(p_parcelas) as p(numero integer,vencimento date,valor numeric) where p.numero<=0 or p.vencimento is null or p.valor<0) then
    raise exception 'Há parcelas inválidas.';
  end if;
  if (select count(distinct p.numero) from jsonb_to_recordset(p_parcelas) as p(numero integer))<>v_quantidade
    or (select min(p.numero) from jsonb_to_recordset(p_parcelas) as p(numero integer))<>1
    or (select max(p.numero) from jsonb_to_recordset(p_parcelas) as p(numero integer))<>v_quantidade then
    raise exception 'A numeração das parcelas deve ser única e sequencial a partir de 1.';
  end if;
  if abs(v_soma-v_pedido.valor_total)>0.01 then raise exception 'A soma das parcelas deve corresponder ao valor total do pedido.'; end if;

  delete from public.pedido_compra_parcelas where pedido_id=p_pedido_id and empresa_id=p_empresa_id;
  insert into public.pedido_compra_parcelas(pedido_id,empresa_id,numero,vencimento,valor,status)
  select p_pedido_id,p_empresa_id,p.numero,p.vencimento,p.valor,'Pendente'
  from jsonb_to_recordset(p_parcelas) as p(numero integer,vencimento date,valor numeric);
  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(p_pedido_id,p_empresa_id,p_user_id,'Financeiro',v_quantidade||' parcela(s) pendente(s) sincronizada(s) sem criar títulos financeiros.');
end $$;

revoke all on function public.alterar_status_pedido_compra(uuid,uuid,uuid,text) from public;
revoke all on function public.salvar_cotacao_pedido_compra(uuid,uuid,uuid,uuid,jsonb) from public;
revoke all on function public.sincronizar_parcelas_pedido_compra(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.alterar_status_pedido_compra(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.salvar_cotacao_pedido_compra(uuid,uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function public.sincronizar_parcelas_pedido_compra(uuid,uuid,uuid,jsonb) to authenticated;

comment on function public.alterar_status_pedido_compra(uuid,uuid,uuid,text) is 'Altera status e grava histórico atomicamente; recebimento permanece em função própria.';
comment on function public.salvar_cotacao_pedido_compra(uuid,uuid,uuid,uuid,jsonb) is 'Cria ou atualiza uma cotação por fornecedor e grava histórico atomicamente.';
comment on function public.sincronizar_parcelas_pedido_compra(uuid,uuid,uuid,jsonb) is 'Substitui apenas parcelas pendentes e grava histórico, sem criar títulos financeiros.';
