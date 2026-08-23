create or replace function public.baixar_titulo_financeiro(p_titulo_id uuid,p_empresa_id uuid,p_valor numeric,p_data date,p_forma text,p_conta text,p_observacoes text,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_titulo public.financeiro_titulos;v_novo numeric;v_baixa uuid;v_tipo text;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_idempotency_key is null then raise exception 'Chave de idempotência obrigatória.';end if;
 select id into v_baixa from public.financeiro_baixas where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;if v_baixa is not null then return v_baixa;end if;
 select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id for update;
 if not found or v_titulo.status='Cancelado' then raise exception 'Título não encontrado ou cancelado.';end if;
 select id into v_baixa from public.financeiro_baixas where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;if v_baixa is not null then return v_baixa;end if;
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
 if not exists(select 1 from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id) then raise exception 'Título não encontrado.';end if;
 if p_valor<=0 or p_status not in ('Pendente','Conciliado','Divergente') then raise exception 'Dados de conciliação inválidos.';end if;
 insert into public.financeiro_conciliacoes(titulo_id,empresa_id,user_id,conta,data_movimento,valor,status,observacoes,idempotency_key)
 values(p_titulo_id,p_empresa_id,auth.uid(),p_conta,p_data,p_valor,p_status,p_observacoes,p_idempotency_key)
 on conflict(empresa_id,idempotency_key) where idempotency_key is not null do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.financeiro_conciliacoes where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;return v_id;end if;
 insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(p_titulo_id,p_empresa_id,auth.uid(),'Conciliação','Conciliação manual registrada.',jsonb_build_object('conciliacao_id',v_id));return v_id;
end $$;

revoke execute on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text,uuid) from public,anon;
revoke execute on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text,uuid) from public,anon;
grant execute on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text,uuid) to authenticated;
grant execute on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text,uuid) to authenticated;
