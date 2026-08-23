-- MIGRATION LOCAL PREPARADA. NÃO EXECUTAR SEM NOVA AUTORIZAÇÃO.
begin;
create function public.registrar_entrada_retroativa_grupo_conta_pessoal(
 p_empresa_id uuid,p_proprietario_id uuid,p_grupo_id uuid,p_data_entrada date,p_idempotency_key uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_uid uuid:=(select auth.uid());v_h public.contas_pagar_pessoais_entradas%rowtype;
 v_e public.contas_pagar_pessoais_pagamento_eventos%rowtype;v_count integer;v_fp text;
begin
 if v_uid is null or p_data_entrada is distinct from date '2026-04-27' or p_idempotency_key is null
 or p_empresa_id<>'8a85591b-2410-405f-8279-910dbcf61011'::uuid or p_proprietario_id<>v_uid
 or p_grupo_id<>'0fcb172c-524c-4499-b93a-5d8d68203165'::uuid then raise exception 'Parâmetros/identidade inválidos'; end if;
 if not exists(select 1 from public.usuarios u where u.id=v_uid and u.empresa_id=p_empresa_id) then raise exception 'Tenant inválido'; end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='despesas'
  and column_name='pagamento_evento_id') then raise exception 'Integração Eventos → Despesas mudou; revisar materialização antes de prosseguir'; end if;
 perform 1 from public.contas_pagar_pessoais p where p.grupo_parcelamento_id=p_grupo_id
  and p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id order by p.parcela_numero for update;
 select count(*),md5(string_agg(to_jsonb(p)::text,'|' order by parcela_numero)) into v_count,v_fp
 from public.contas_pagar_pessoais p where p.grupo_parcelamento_id=p_grupo_id;
 select * into v_h from public.contas_pagar_pessoais_entradas h where h.empresa_id=p_empresa_id
  and h.proprietario_id=p_proprietario_id and h.idempotency_key=p_idempotency_key;
 if found then
  if v_h.grupo_parcelamento_id<>p_grupo_id or v_h.data_entrada<>p_data_entrada
  or v_h.valor_total_compra<>40142 or v_h.valor_entrada<>8750 or v_h.saldo_financiado<>31392
  or (select count(*) from public.contas_pagar_pessoais p where p.grupo_parcelamento_id=p_grupo_id and p.entrada_id=v_h.id)<>24
  or (select count(*) from public.contas_pagar_pessoais_pagamento_eventos e where e.entrada_id=v_h.id and e.tipo='Entrada')<>1
  then raise exception 'Replay idempotente divergente'; end if;
  return jsonb_build_object('entrada_id',v_h.id,'replay',true);
 end if;
 if v_count<>24 or v_fp<>'1f36adcebcc65603adc286d1e2636ed4'
 or exists(select 1 from public.contas_pagar_pessoais p where p.grupo_parcelamento_id=p_grupo_id and p.entrada_id is not null)
 or exists(select 1 from public.contas_pagar_pessoais_entradas h where h.grupo_parcelamento_id=p_grupo_id)
 then raise exception 'Guards do grupo divergiram'; end if;
 insert into public.contas_pagar_pessoais_entradas(grupo_parcelamento_id,empresa_id,proprietario_id,idempotency_key,
  descricao,fornecedor,valor_total_compra,valor_entrada,saldo_financiado,data_entrada,parcelas_total,
  primeiro_vencimento,periodicidade,categoria,observacoes)
 values(p_grupo_id,p_empresa_id,p_proprietario_id,p_idempotency_key,'MOTO CBR 300','BANCO PAN',
  40142,8750,31392,p_data_entrada,24,'2026-05-27','Mensal','VEÍCULO','Entrada real retroativa confirmada pelo usuário')
 returning * into v_h;
 update public.contas_pagar_pessoais set entrada_id=v_h.id where grupo_parcelamento_id=p_grupo_id
  and empresa_id=p_empresa_id and proprietario_id=p_proprietario_id and entrada_id is null;
 get diagnostics v_count=row_count;if v_count<>24 then raise exception 'ROW_COUNT de parcelas divergente: %',v_count;end if;
 insert into public.contas_pagar_pessoais_pagamento_eventos(empresa_id,proprietario_id,entrada_id,tipo,
  valor_nominal,valor_pago,desconto_obtido,pago_em,observacoes,idempotency_key,autor_id)
 values(p_empresa_id,p_proprietario_id,v_h.id,'Entrada',8750,8750,0,p_data_entrada,
  'Entrada retroativa do grupo MOTO CBR 300',p_idempotency_key,v_uid) returning * into v_e;
 return jsonb_build_object('entrada_id',v_h.id,'evento_id',v_e.id,'replay',false);
end $fn$;
revoke execute on function public.registrar_entrada_retroativa_grupo_conta_pessoal(uuid,uuid,uuid,date,uuid) from public,anon;
grant execute on function public.registrar_entrada_retroativa_grupo_conta_pessoal(uuid,uuid,uuid,date,uuid) to authenticated;
commit;
