-- PROPOSTA DE ROLLBACK. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
begin;

do $rollback_contas_fixas$
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
      and con.conrelid = 'public.contas_fixas'::regclass
      and a.attname = 'empresa_id'
  ) and not exists (
    select 1 from public.empresas
    where id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
  ) then
    raise exception 'ABORTADO: rollback violaria FK; empresa antiga não existe';
  end if;

  if (select count(*) from public.contas_fixas
      where id in (3, 5)
        and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) <> 2 then
    raise exception 'ABORTADO: IDs 3 e 5 não estão exatamente em Mauro';
  end if;

  update public.contas_fixas
  set empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
  where id in (3, 5)
    and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid;

  get diagnostics v_count = row_count;
  if v_count <> 2 then
    raise exception 'ABORTADO: rollback contas_fixas %, esperado 2', v_count;
  end if;
end
$rollback_contas_fixas$;

commit;

