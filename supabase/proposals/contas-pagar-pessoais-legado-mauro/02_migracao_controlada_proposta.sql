-- PROPOSTA LOCAL FAIL-CLOSED. NÃO EXECUTAR SEM NOVA AUTORIZAÇÃO EXPRESSA.
begin;
do $migracao_contas_pagar_pessoais_mauro_v2$
declare v_count integer;
begin
  if (select count(*) from public.usuarios where id='8a85591b-2410-405f-8279-910dbcf61011'::uuid and empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)<>1 then
    raise exception 'ABORTADO: identidade/empresa oficial de Mauro divergente';
  end if;
  if (select count(*) from public.contas_pagar where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)<>18
     or (select count(*) from public.contas_pagar where empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid)<>4 then
    raise exception 'ABORTADO: escopo deixou de ser 18 atuais + 4 legados';
  end if;
  if (select count(*) from public.contas_pagar where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid and id in (
    '4c282335-9aa7-4df6-9390-dd90cb99e8a9'::uuid,'5921f97c-81cd-41ec-a347-3ab3e3c511d3'::uuid,
    '13bc39b3-b896-482c-b509-802f05cfc22c'::uuid,'09dd7fb9-de2a-4e59-ab0d-b2bbbffded55'::uuid,
    '7a1322c4-8a56-4455-b4c0-49fd146687b6'::uuid,'c543fd6c-4bbf-47fe-bb5d-2df53d142e3f'::uuid,
    'a8fbb7c2-eb36-468c-b956-b967de0860d1'::uuid,'f051f708-0bfc-4095-98a2-1f0351c915bf'::uuid,
    'f92a96d6-e7e0-4f04-bf28-92ddb5c8607e'::uuid,'322d87dc-e29f-44a8-bce2-7e2d7a95261d'::uuid,
    'c196fc9f-1c52-4a07-8260-6c6747cc7e59'::uuid,'ffea9470-595f-41e2-a9de-1952bb781675'::uuid,
    'f2fcab52-9273-4412-89e5-708b101a932e'::uuid,'ade49092-a552-4ba5-b2f9-856eea1ec1ae'::uuid,
    'b0ed2fef-bd18-4598-b466-786e16684589'::uuid,'35b8f3f5-9f15-4d45-a292-3f66d09b70be'::uuid,
    '6cd10fef-c4f5-46a8-a2be-abdb76d65617'::uuid,'83fef1f9-39df-4c8f-b2e0-f1aef0536930'::uuid
  ))<>18 then raise exception 'ABORTADO: manifesto dos 18 UUIDs canônicos divergente'; end if;
  if (select count(*) from public.contas_pagar where id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid
      and empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid and fornecedor='CPFL'
      and descricao='CONTA DE LUZ' and valor=128.93 and vencimento=date '2026-04-23' and status='Pendente')<>1 then
    raise exception 'ABORTADO: CPFL legada diverge do preflight';
  end if;
  if (select count(*) from public.contas_pagar where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid or id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid)<>19
     or (select sum(valor) from public.contas_pagar where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid or id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid)<>10182.73
     or (select count(*) from public.contas_pagar where (empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid or id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid) and status='Pago')<>15
     or (select count(*) from public.contas_pagar where (empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid or id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid) and status='Pendente')<>4 then
    raise exception 'ABORTADO: quantidade, status ou total canônico divergente';
  end if;
  if (select count(*) from public.contas_pagar where id in ('c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid,'40091009-11fb-4c5c-ac63-24a7c4070428'::uuid) and empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid)<>3 then
    raise exception 'ABORTADO: duplicidades legadas divergentes';
  end if;
  if exists (select 1 from public.contas_pagar_pessoais d join public.contas_pagar o on o.id=d.source_legacy_id where o.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid or o.id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid) then
    raise exception 'ABORTADO: origem canônica já existe no destino';
  end if;

  insert into public.contas_pagar_pessoais (empresa_id,proprietario_id,source_legacy_id,descricao,fornecedor,valor,vencimento,status,categoria,observacoes,criado_em,atualizado_em)
  select '8a85591b-2410-405f-8279-910dbcf61011'::uuid,'8a85591b-2410-405f-8279-910dbcf61011'::uuid,
         origem.id,origem.descricao,origem.fornecedor,origem.valor,origem.vencimento,origem.status,'Legado pessoal',
         case when origem.id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid then 'CPFL legada sem correspondente atual; inclusão explícita.' else 'Cópia canônica; origem preservada.' end,
         coalesce(origem.created_at,now()),now()
  from public.contas_pagar origem
  where origem.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
     or (origem.id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid and origem.empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid);
  get diagnostics v_count=row_count;
  if v_count<>19 then raise exception 'ABORTADO: inseridas %, esperado 19',v_count; end if;
  if exists (select 1 from public.contas_pagar_pessoais where source_legacy_id in ('c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid,'40091009-11fb-4c5c-ac63-24a7c4070428'::uuid)) then
    raise exception 'ABORTADO: duplicidade legada copiada';
  end if;
  if (select count(*) from public.contas_pagar where empresa_id in ('8a85591b-2410-405f-8279-910dbcf61011'::uuid,'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid))<>22 then
    raise exception 'ABORTADO: origens alteradas durante a transação';
  end if;
end $migracao_contas_pagar_pessoais_mauro_v2$;
commit;
