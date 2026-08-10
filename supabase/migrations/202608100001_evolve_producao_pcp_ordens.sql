-- Fase 22: evolução local do PCP. Não aplicar automaticamente.

alter table public.ordens_producao
  add column if not exists origem text generated always as (
    case when venda_id is not null then 'Venda'
         when orcamento_id is not null then 'Orçamento aprovado'
         else 'Manual' end
  ) stored;

update public.ordens_producao
set status = 'Planejada', updated_at = now()
where status = 'Programada';

alter table public.ordens_producao drop constraint if exists ordens_producao_status_check;
alter table public.ordens_producao add constraint ordens_producao_status_check
  check (status in ('Rascunho','Planejada','Aguardando material','Liberada','Em produção','Pausada','Concluída','Cancelada'));

alter table public.ordem_producao_apontamentos
  add column if not exists ocorrido_em timestamptz not null default now();

create or replace function public.consumir_material_producao(p_material_id uuid,p_empresa_id text,p_quantidade numeric)
returns void language plpgsql security invoker set search_path=public as $$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_usar_reserva numeric;v_sem_reserva numeric;v_novo numeric;
begin
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Material não encontrado.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id and status in ('Em produção','Pausada') for update;
 if not found then raise exception 'OP não está em produção.';end if;
 v_novo:=v_material.quantidade_consumida+p_quantidade;
 if v_novo>v_material.quantidade_prevista then raise exception 'Consumo acima da necessidade prevista.';end if;
 v_usar_reserva:=least(p_quantidade,v_material.quantidade_reservada);
 v_sem_reserva:=p_quantidade-v_usar_reserva;
 if v_usar_reserva>0 then
   perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Liberação',v_usar_reserva,'Produção','consumo-liberacao:'||v_material.id::text||':'||v_novo::text,'Reserva liberada para consumo confirmado da '||v_ordem.numero_op,null,null);
 end if;
 -- Após liberar a reserva, todo o consumo fica disponível e pode ser baixado pelo serviço central.
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Saída',p_quantidade,'Produção','consumo:'||v_material.id::text||':'||v_novo::text,'Consumo real confirmado da '||v_ordem.numero_op,null,null);
 update public.ordem_producao_materiais set quantidade_reservada=quantidade_reservada-v_usar_reserva,quantidade_consumida=v_novo,updated_at=now() where id=v_material.id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados)
 values(v_ordem.id,p_empresa_id,auth.uid(),'Consumo','Consumo real enviado ao estoque após confirmação.',jsonb_build_object('material_id',v_material.id,'quantidade',p_quantidade,'usou_reserva',v_usar_reserva,'sem_reserva',v_sem_reserva));
end $$;

grant execute on function public.consumir_material_producao(uuid,text,numeric) to authenticated;
