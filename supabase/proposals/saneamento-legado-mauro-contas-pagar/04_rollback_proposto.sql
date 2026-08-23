-- PROPOSTA DE ROLLBACK. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
begin;

do $rollback_contas_pagar$
declare
  v_count integer;
begin
  if exists (
    select 1
    from pg_catalog.pg_constraint con
    join unnest(con.conkey) k(attnum) on true
    join pg_catalog.pg_attribute a
      on a.attrelid = con.conrelid and a.attnum = k.attnum
    where con.contype = 'f'
      and con.conrelid = 'public.contas_pagar'::regclass
      and a.attname = 'empresa_id'
  ) and not exists (
    select 1 from public.empresas
    where id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
  ) then
    raise exception 'ABORTADO: rollback violaria FK; empresa antiga não existe';
  end if;

  if (select count(*) from public.contas_pagar where id in (
        'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,
        '40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
        'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,
        'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid
      ) and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) <> 4 then
    raise exception 'ABORTADO: quatro contas_pagar não estão exatamente em Mauro';
  end if;

  update public.contas_pagar
  set empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
  where id in (
    'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,
    '40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
    'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,
    'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid
  )
    and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid;

  get diagnostics v_count = row_count;
  if v_count <> 4 then
    raise exception 'ABORTADO: rollback contas_pagar %, esperado 4', v_count;
  end if;
end
$rollback_contas_pagar$;

commit;

