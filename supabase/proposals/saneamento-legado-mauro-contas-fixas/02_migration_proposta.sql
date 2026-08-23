-- PROPOSTA. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
begin;

do $saneamento_contas_fixas$
declare
  v_count integer;
begin
  if (select count(*) from public.empresas
      where id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) <> 1 then
    raise exception 'ABORTADO: empresa oficial do Mauro ausente ou divergente';
  end if;

  if (select count(*) from public.contas_fixas where id in (3, 5)) <> 2
     or (select count(*) from public.contas_fixas
         where id in (3, 5)
           and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid) <> 2 then
    raise exception 'ABORTADO: esperados somente IDs 3 e 5 no tenant antigo';
  end if;

  if not exists (select 1 from public.contas_fixas
                 where id = 3 and descricao = 'ALUGUEL APARTAMENTO')
     or not exists (select 1 from public.contas_fixas
                    where id = 5 and descricao = 'ODONTOCOMPANY') then
    raise exception 'ABORTADO: descrições dos IDs 3 e 5 divergentes';
  end if;

  update public.contas_fixas
  set empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
  where id in (3, 5)
    and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid;

  get diagnostics v_count = row_count;
  if v_count <> 2 then
    raise exception 'ABORTADO: contas_fixas alteradas %, esperado 2', v_count;
  end if;

  if (select count(*) from public.contas_fixas
      where id in (3, 5)
        and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) <> 2 then
    raise exception 'ABORTADO: validação interna pós-update divergente';
  end if;
end
$saneamento_contas_fixas$;

commit;

