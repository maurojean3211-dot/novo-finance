alter table public.vendas add column if not exists idempotency_key uuid;
alter table public.compras add column if not exists idempotency_key uuid;
alter table public.lancamentos add column if not exists recebimento_id uuid;
alter table public.lancamentos add column if not exists idempotency_key uuid;
alter table public.despesas add column if not exists idempotency_key uuid;
alter table public.financeiro_baixas add column if not exists idempotency_key uuid;
alter table public.financeiro_conciliacoes add column if not exists idempotency_key uuid;
alter table public.pedido_compra_historico add column if not exists idempotency_key uuid;
alter table public.contas_pagar_pessoais add column if not exists document_idempotency_key uuid;

create unique index if not exists vendas_empresa_idempotency_key on public.vendas(empresa_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists compras_empresa_idempotency_key on public.compras(empresa_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists lancamentos_empresa_idempotency_key on public.lancamentos(empresa_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists despesas_empresa_idempotency_key on public.despesas(empresa_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists contas_pagar_pessoais_empresa_document_idempotency_key on public.contas_pagar_pessoais(empresa_id,document_idempotency_key) where document_idempotency_key is not null;
create unique index if not exists financeiro_baixas_empresa_idempotency_key on public.financeiro_baixas(empresa_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists financeiro_conciliacoes_empresa_idempotency_key on public.financeiro_conciliacoes(empresa_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists pedido_compra_historico_empresa_idempotency_key on public.pedido_compra_historico(empresa_id,idempotency_key) where idempotency_key is not null;

create or replace function public.confirmar_recebimento(p_recebimento_id uuid,p_empresa_id uuid,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_recebimento public.recebimentos;v_lancamento uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_idempotency_key is null then raise exception 'Chave de idempotência obrigatória.';end if;
 select id into v_lancamento from public.lancamentos where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;
 if v_lancamento is not null then return v_lancamento;end if;
 select * into v_recebimento from public.recebimentos where id=p_recebimento_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Recebimento não encontrado.';end if;
 update public.recebimentos set status='pago',updated_at=now() where id=p_recebimento_id and empresa_id=p_empresa_id;
 insert into public.lancamentos(empresa_id,user_id,recebimento_id,tipo,descricao,valor,ano,mes,data,status,idempotency_key)
 values(p_empresa_id,auth.uid(),p_recebimento_id,'receita','Recebimento confirmado',v_recebimento.valor,extract(year from current_date)::integer,extract(month from current_date)::integer,current_date,'recebido',p_idempotency_key)
 on conflict(empresa_id,idempotency_key) where idempotency_key is not null do update set idempotency_key=excluded.idempotency_key returning id into v_lancamento;
 return v_lancamento;
end $$;

create or replace function public.baixar_titulo_financeiro(p_titulo_id uuid,p_empresa_id uuid,p_valor numeric,p_data date,p_forma text,p_conta text,p_observacoes text,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_titulo public.financeiro_titulos;v_novo numeric;v_baixa uuid;v_tipo text;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_idempotency_key is null then raise exception 'Chave de idempotência obrigatória.';end if;
 select id into v_baixa from public.financeiro_baixas where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;if v_baixa is not null then return v_baixa;end if;
 select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id for update;
 if not found or v_titulo.status='Cancelado' then raise exception 'Título não encontrado ou cancelado.';end if;
 if p_valor<=0 or p_valor>v_titulo.saldo then raise exception 'Valor de baixa inválido.';end if;
 v_novo:=v_titulo.valor_baixado+p_valor;v_tipo:=case when v_novo<v_titulo.valor_original then 'Baixa parcial' else 'Baixa' end;
 update public.financeiro_titulos set valor_baixado=v_novo,status=case when v_novo=v_titulo.valor_original then 'Liquidado' else 'Parcial' end,data_liquidacao=case when v_novo=v_titulo.valor_original then p_data else null end,forma_pagamento=p_forma,conta=p_conta,updated_at=now() where id=p_titulo_id and empresa_id=p_empresa_id;
 insert into public.financeiro_baixas(titulo_id,empresa_id,user_id,tipo,valor,valor_baixado_anterior,valor_baixado_resultante,saldo_resultante,data_movimento,forma_pagamento,conta,observacoes,idempotency_key) values(p_titulo_id,p_empresa_id,auth.uid(),'Baixa',p_valor,v_titulo.valor_baixado,v_novo,v_titulo.valor_original-v_novo,p_data,p_forma,p_conta,p_observacoes,p_idempotency_key) returning id into v_baixa;
 insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(p_titulo_id,p_empresa_id,auth.uid(),v_tipo,'Baixa financeira registrada.',jsonb_build_object('baixa_id',v_baixa,'valor',p_valor));return v_baixa;
end $$;

create or replace function public.conciliar_titulo_financeiro(p_titulo_id uuid,p_empresa_id uuid,p_conta text,p_data date,p_valor numeric,p_status text,p_observacoes text,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_idempotency_key is null then raise exception 'Chave de idempotência obrigatória.';end if;
 select id into v_id from public.financeiro_conciliacoes where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;if v_id is not null then return v_id;end if;
 if not exists(select 1 from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id) then raise exception 'Título não encontrado.';end if;
 if p_valor<=0 or p_status not in ('Pendente','Conciliado','Divergente') then raise exception 'Dados de conciliação inválidos.';end if;
 insert into public.financeiro_conciliacoes(titulo_id,empresa_id,user_id,conta,data_movimento,valor,status,observacoes,idempotency_key) values(p_titulo_id,p_empresa_id,auth.uid(),p_conta,p_data,p_valor,p_status,p_observacoes,p_idempotency_key) returning id into v_id;
 insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(p_titulo_id,p_empresa_id,auth.uid(),'Conciliação','Conciliação manual registrada.',jsonb_build_object('conciliacao_id',v_id));return v_id;
end $$;

create or replace function public.receber_item_pedido(p_item_id uuid,p_empresa_id uuid,p_quantidade numeric,p_idempotency_key uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare v_item public.pedido_compra_itens;v_pedido public.pedidos_compra;v_novo numeric;v_pendentes integer;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 or p_idempotency_key is null then raise exception 'Quantidade e chave de idempotência são obrigatórias.';end if;
 select * into v_item from public.pedido_compra_itens where id=p_item_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Item não encontrado.';end if;
 if exists(select 1 from public.pedido_compra_historico where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key) then return;end if;
 select * into v_pedido from public.pedidos_compra where id=v_item.pedido_id and empresa_id=p_empresa_id and status in ('Comprado','Recebido parcialmente') for update;
 if not found or v_item.estoque_id is null then raise exception 'Pedido ou estoque não está apto para recebimento.';end if;
 v_novo:=v_item.quantidade_recebida+p_quantidade;if v_novo>v_item.quantidade then raise exception 'Recebimento maior que o saldo pendente.';end if;
 perform public.movimentar_estoque(v_item.estoque_id,p_empresa_id,'Entrada',p_quantidade,'Pedido de compra',p_item_id::text||':'||v_novo::text,'Recebimento confirmado do pedido '||v_pedido.numero,null,null);
 update public.pedido_compra_itens set quantidade_recebida=v_novo where id=p_item_id and empresa_id=p_empresa_id;
 select count(*) into v_pendentes from public.pedido_compra_itens where pedido_id=v_pedido.id and empresa_id=p_empresa_id and quantidade_recebida<quantidade;
 update public.pedidos_compra set status=case when v_pendentes=0 then 'Recebido' else 'Recebido parcialmente' end,updated_at=now() where id=v_pedido.id and empresa_id=p_empresa_id;
 insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao,idempotency_key) values(v_pedido.id,p_empresa_id,auth.uid(),'Recebimento','Recebimento de '||p_quantidade||' confirmado e enviado ao estoque.',p_idempotency_key);
end $$;

revoke execute on function public.confirmar_recebimento(uuid,uuid,uuid) from public,anon;
revoke execute on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text,uuid) from public,anon;
revoke execute on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text,uuid) from public,anon;
revoke execute on function public.receber_item_pedido(uuid,uuid,numeric,uuid) from public,anon;
revoke execute on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text) from authenticated;
revoke execute on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text) from authenticated;
revoke execute on function public.receber_item_pedido(uuid,uuid,numeric) from authenticated;
grant execute on function public.confirmar_recebimento(uuid,uuid,uuid) to authenticated;
grant execute on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text,uuid) to authenticated;
grant execute on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text,uuid) to authenticated;
grant execute on function public.receber_item_pedido(uuid,uuid,numeric,uuid) to authenticated;
