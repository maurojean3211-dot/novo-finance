create table public.ordens_producao (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  numero_op text not null, cliente_id text, cliente_nome text, venda_id text,
  orcamento_id uuid,
  produto_id text, produto text not null, descricao text, liga text, tempera text, dimensao text,
  quantidade_planejada numeric(14,4) not null check(quantidade_planejada>0), unidade text not null default 'kg',
  peso_planejado numeric(14,4) not null default 0 check(peso_planejado>=0),
  peso_produzido numeric(14,4) not null default 0 check(peso_produzido>=0),
  quantidade_produzida numeric(14,4) not null default 0 check(quantidade_produzida>=0),
  quantidade_perdida numeric(14,4) not null default 0 check(quantidade_perdida>=0),
  peso_perdido numeric(14,4) not null default 0 check(peso_perdido>=0),
  data_criacao date not null default current_date, data_prevista_inicio date, data_prevista_fim date,
  data_inicio_real timestamptz, data_fim_real timestamptz,
  prioridade text not null default 'Média' check(prioridade in ('Baixa','Média','Alta','Urgente')),
  status text not null default 'Rascunho' check(status in ('Rascunho','Planejada','Programada','Em produção','Pausada','Concluída','Cancelada')),
  responsavel text, observacoes text,
  produto_acabado_estoque_id uuid,
  entrada_produto_acabado_em timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,empresa_id), unique(empresa_id,numero_op), check(quantidade_produzida+quantidade_perdida<=quantidade_planejada),
  foreign key(orcamento_id,empresa_id) references public.orcamentos(id,empresa_id) on update cascade on delete restrict,
  foreign key(produto_acabado_estoque_id,empresa_id) references public.estoque(id,empresa_id) on update cascade on delete restrict
);

create table public.ordem_producao_materiais (
  id uuid primary key default gen_random_uuid(), ordem_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict, estoque_id uuid not null,
  produto_id text, material text not null, quantidade_prevista numeric(14,4) not null check(quantidade_prevista>0),
  quantidade_reservada numeric(14,4) not null default 0 check(quantidade_reservada>=0),
  quantidade_consumida numeric(14,4) not null default 0 check(quantidade_consumida>=0),
  unidade text not null default 'kg', observacoes text, necessidade_compra boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(ordem_id,estoque_id), check(quantidade_reservada+quantidade_consumida<=quantidade_prevista),
  foreign key(ordem_id,empresa_id) references public.ordens_producao(id,empresa_id) on update cascade on delete restrict,
  foreign key(estoque_id,empresa_id) references public.estoque(id,empresa_id) on update cascade on delete restrict
);

create table public.ordem_producao_apontamentos (
  id uuid primary key default gen_random_uuid(), ordem_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check(tipo in ('Início','Pausa','Retomada','Produção','Perda','Conclusão')),
  quantidade numeric(14,4) not null default 0 check(quantidade>=0), peso numeric(14,4) not null default 0 check(peso>=0),
  motivo_perda text check(motivo_perda is null or motivo_perda in ('Qualidade','Processo','Matéria-prima','Equipamento','Medida','Outro')),
  observacoes text, created_at timestamptz not null default now(),
  foreign key(ordem_id,empresa_id) references public.ordens_producao(id,empresa_id) on update cascade on delete restrict
);

create table public.ordem_producao_historico (
  id uuid primary key default gen_random_uuid(), ordem_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict, user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  tipo text not null check(tipo in ('Criação','Edição','Planejamento','Programação','Reserva','Início','Pausa','Retomada','Consumo','Devolução','Perda','Conclusão','Cancelamento','Compra','Produto acabado')),
  descricao text not null, dados jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  foreign key(ordem_id,empresa_id) references public.ordens_producao(id,empresa_id) on update cascade on delete restrict
);

create index if not exists ordens_producao_empresa_status_idx on public.ordens_producao(empresa_id,status);
create index if not exists ordens_producao_empresa_previsao_idx on public.ordens_producao(empresa_id,data_prevista_inicio,data_prevista_fim);
create index if not exists ordens_producao_origem_idx on public.ordens_producao(empresa_id,venda_id,orcamento_id);
create index if not exists ordem_materiais_ordem_idx on public.ordem_producao_materiais(ordem_id);
create index if not exists ordem_apontamentos_ordem_idx on public.ordem_producao_apontamentos(ordem_id,created_at desc);
create index if not exists ordem_historico_ordem_idx on public.ordem_producao_historico(ordem_id,created_at desc);

alter table public.ordens_producao enable row level security;
alter table public.ordem_producao_materiais enable row level security;
alter table public.ordem_producao_apontamentos enable row level security;
alter table public.ordem_producao_historico enable row level security;

create policy "ordens_producao_select_empresa" on public.ordens_producao for select to authenticated
 using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordens_producao.empresa_id));
create policy "ordens_producao_insert_empresa" on public.ordens_producao for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordens_producao.empresa_id));
create policy "ordens_producao_update_empresa" on public.ordens_producao for update to authenticated
 using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordens_producao.empresa_id))
 with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordens_producao.empresa_id));
create policy "ordem_materiais_empresa" on public.ordem_producao_materiais for all to authenticated
 using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_materiais.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_materiais.ordem_id and o.empresa_id=ordem_producao_materiais.empresa_id))
 with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_materiais.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_materiais.ordem_id and o.empresa_id=ordem_producao_materiais.empresa_id));
create policy "ordem_apontamentos_select" on public.ordem_producao_apontamentos for select to authenticated
 using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_apontamentos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_apontamentos.ordem_id and o.empresa_id=ordem_producao_apontamentos.empresa_id));
create policy "ordem_apontamentos_insert" on public.ordem_producao_apontamentos for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_apontamentos.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_apontamentos.ordem_id and o.empresa_id=ordem_producao_apontamentos.empresa_id));
create policy "ordem_historico_select" on public.ordem_producao_historico for select to authenticated
 using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_historico.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_historico.ordem_id and o.empresa_id=ordem_producao_historico.empresa_id));
create policy "ordem_historico_insert" on public.ordem_producao_historico for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=ordem_producao_historico.empresa_id) and exists(select 1 from public.ordens_producao o where o.id=ordem_producao_historico.ordem_id and o.empresa_id=ordem_producao_historico.empresa_id));

create or replace function public.reservar_material_producao(p_material_id uuid,p_empresa_id uuid,p_quantidade numeric)
returns void language plpgsql security invoker set search_path=public as $$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_novo numeric;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Material não encontrado.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id and status in ('Rascunho','Planejada','Programada','Pausada') for update;
 if not found then raise exception 'OP não permite nova reserva.';end if;
 v_novo:=v_material.quantidade_reservada+p_quantidade;
 if v_novo+v_material.quantidade_consumida>v_material.quantidade_prevista then raise exception 'Reserva acima da necessidade prevista.';end if;
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Reserva',p_quantidade,'Produção','reserva:'||v_material.id::text||':'||v_novo::text,'Reserva confirmada para '||v_ordem.numero_op,null,null);
 update public.ordem_producao_materiais set quantidade_reservada=v_novo,necessidade_compra=false,updated_at=now() where id=v_material.id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(v_ordem.id,p_empresa_id,auth.uid(),'Reserva','Material reservado após confirmação.',jsonb_build_object('material_id',v_material.id,'quantidade',p_quantidade));
end $$;

create or replace function public.consumir_material_producao(p_material_id uuid,p_empresa_id uuid,p_quantidade numeric)
returns void language plpgsql security invoker set search_path=public as $$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_usar_reserva numeric;v_novo numeric;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Material não encontrado.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id and status in ('Em produção','Pausada') for update;
 if not found then raise exception 'OP não está em produção.';end if;
 v_novo:=v_material.quantidade_consumida+p_quantidade;
 if v_novo>v_material.quantidade_prevista then raise exception 'Consumo acima da necessidade prevista.';end if;
 v_usar_reserva:=least(p_quantidade,v_material.quantidade_reservada);
 if v_usar_reserva>0 then perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Liberação',v_usar_reserva,'Produção','consumo-liberacao:'||v_material.id::text||':'||v_novo::text,'Reserva convertida em consumo da '||v_ordem.numero_op,null,null);end if;
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Saída',p_quantidade,'Produção','consumo:'||v_material.id::text||':'||v_novo::text,'Consumo real da '||v_ordem.numero_op,null,null);
 update public.ordem_producao_materiais set quantidade_reservada=quantidade_reservada-v_usar_reserva,quantidade_consumida=v_novo,updated_at=now() where id=v_material.id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(v_ordem.id,p_empresa_id,auth.uid(),'Consumo','Consumo real enviado ao estoque.',jsonb_build_object('material_id',v_material.id,'quantidade',p_quantidade));
end $$;

create or replace function public.liberar_material_producao(p_material_id uuid,p_empresa_id uuid,p_quantidade numeric)
returns void language plpgsql security invoker set search_path=public as $$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_novo numeric;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 if not found or p_quantidade>v_material.quantidade_reservada then raise exception 'Reserva insuficiente.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id for update;
 v_novo:=v_material.quantidade_reservada-p_quantidade;
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Liberação',p_quantidade,'Produção','liberacao:'||v_material.id::text||':'||v_novo::text,'Liberação confirmada da '||v_ordem.numero_op,null,null);
 update public.ordem_producao_materiais set quantidade_reservada=v_novo,updated_at=now() where id=v_material.id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(v_ordem.id,p_empresa_id,auth.uid(),'Devolução','Reserva liberada ao estoque.',jsonb_build_object('material_id',v_material.id,'quantidade',p_quantidade));
end $$;

create or replace function public.reverter_consumo_producao(p_material_id uuid,p_empresa_id uuid,p_movimentacao_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_mov public.estoque_movimentacoes;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 select * into v_mov from public.estoque_movimentacoes where id=p_movimentacao_id and empresa_id=p_empresa_id and estoque_id=v_material.estoque_id and tipo='Saída' and origem='Produção';
 if not found or v_mov.quantidade>v_material.quantidade_consumida then raise exception 'Consumo inválido para reversão.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id for update;
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Reversão',v_mov.quantidade,'Produção','reversao:'||p_movimentacao_id::text,'Reversão segura do consumo da '||v_ordem.numero_op,null,p_movimentacao_id);
 update public.ordem_producao_materiais set quantidade_consumida=quantidade_consumida-v_mov.quantidade,updated_at=now() where id=v_material.id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(v_ordem.id,p_empresa_id,auth.uid(),'Devolução','Consumo revertido sem apagar a movimentação original.',jsonb_build_object('movimentacao_id',p_movimentacao_id,'quantidade',v_mov.quantidade));
end $$;

create or replace function public.entrar_produto_acabado(p_ordem_id uuid,p_empresa_id uuid,p_estoque_id uuid,p_quantidade numeric)
returns void language plpgsql security invoker set search_path=public as $$
declare v_ordem public.ordens_producao;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_ordem from public.ordens_producao where id=p_ordem_id and empresa_id=p_empresa_id and status='Concluída' for update;
 if not found or v_ordem.entrada_produto_acabado_em is not null then raise exception 'OP não concluída ou entrada já realizada.';end if;
 perform public.movimentar_estoque(p_estoque_id,p_empresa_id,'Entrada',p_quantidade,'Produção','produto-acabado:'||p_ordem_id::text,'Entrada confirmada do produto acabado da '||v_ordem.numero_op,null,null);
 update public.ordens_producao set produto_acabado_estoque_id=p_estoque_id,entrada_produto_acabado_em=now(),updated_at=now() where id=p_ordem_id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(p_ordem_id,p_empresa_id,auth.uid(),'Produto acabado','Entrada do produto acabado confirmada.',jsonb_build_object('estoque_id',p_estoque_id,'quantidade',p_quantidade));
end $$;

grant select,insert,update on public.ordens_producao,public.ordem_producao_materiais to authenticated;
grant select,insert on public.ordem_producao_apontamentos,public.ordem_producao_historico to authenticated;
revoke execute on function public.reservar_material_producao(uuid,uuid,numeric) from public;
revoke execute on function public.consumir_material_producao(uuid,uuid,numeric) from public;
revoke execute on function public.liberar_material_producao(uuid,uuid,numeric) from public;
revoke execute on function public.reverter_consumo_producao(uuid,uuid,uuid) from public;
revoke execute on function public.entrar_produto_acabado(uuid,uuid,uuid,numeric) from public;
grant execute on function public.reservar_material_producao(uuid,uuid,numeric) to authenticated;
grant execute on function public.consumir_material_producao(uuid,uuid,numeric) to authenticated;
grant execute on function public.liberar_material_producao(uuid,uuid,numeric) to authenticated;
grant execute on function public.reverter_consumo_producao(uuid,uuid,uuid) to authenticated;
grant execute on function public.entrar_produto_acabado(uuid,uuid,uuid,numeric) to authenticated;
comment on table public.ordem_producao_historico is 'Histórico imutável: authenticated não recebe UPDATE ou DELETE.';
comment on table public.ordem_producao_apontamentos is 'Apontamentos imutáveis: correções são novos eventos.';
