-- PROPOSTA NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
begin;
do $saneamento$
declare v_count integer;
begin
 if (select count(*) from public.empresas where id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)<>1 then
  raise exception 'ABORTADO: empresa oficial do Mauro ausente ou divergente'; end if;
 if (select count(*) from public.contas_fixas where id in (3,5))<>2
    or (select count(*) from public.contas_fixas where id in (3,5) and empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid)<>2 then
  raise exception 'ABORTADO: esperados IDs 3 e 5 em contas_fixas/becf'; end if;
 if (select count(*) from public.contas_pagar where id in (
   'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,'40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
   'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid))<>4
    or (select count(*) from public.contas_pagar where id in (
   'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,'40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
   'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid)
   and empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid)<>4 then
  raise exception 'ABORTADO: quatro contas_pagar/becf divergentes'; end if;

 update public.contas_fixas set empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
 where empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid and id in (3,5);
 get diagnostics v_count=row_count;
 if v_count<>2 then raise exception 'ABORTADO: contas_fixas %, esperado 2',v_count; end if;

 update public.contas_pagar set empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
 where empresa_id='becf3dd8-33d2-4412-bab6-559b264bed07'::uuid and id in (
  'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,'40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
  'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid);
 get diagnostics v_count=row_count;
 if v_count<>4 then raise exception 'ABORTADO: contas_pagar %, esperado 4',v_count; end if;

 if (select count(*) from public.contas_fixas where id in (3,5) and empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)<>2
 or (select count(*) from public.contas_pagar where id in (
  'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,'40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
  'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid)
  and empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)<>4 then
  raise exception 'ABORTADO: validação interna pós-update divergente'; end if;
end $saneamento$;
commit;
