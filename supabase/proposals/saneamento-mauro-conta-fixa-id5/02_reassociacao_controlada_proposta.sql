-- PROPOSTA LOCAL. NÃO EXECUTAR SEM NOVA AUTORIZAÇÃO EXPRESSA.
begin;

do $reassociar_conta_fixa_id5$
declare
  v_count integer;
begin
  if (select count(*) from public.empresas
      where id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) <> 1
     or (select count(*) from public.usuarios
         where id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
           and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) <> 1 then
    raise exception 'ABORTADO: identidade ou empresa atual de Mauro divergente';
  end if;

  if (select count(*) from public.contas_fixas
      where id = 5
        and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
        and descricao = 'ODONTOCOMPANY'
        and valor = 49.90
        and dia_vencimento = 10
        and frequencia = 'Mensal'
        and ativo is true) <> 1 then
    raise exception 'ABORTADO: ID 5 não corresponde integralmente ao registro confirmado';
  end if;

  if (select count(*) from public.contas_fixas
      where id = 3
        and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
        and descricao = 'ALUGUEL APARTAMENTO'
        and valor = 1947.64
        and dia_vencimento = 11) <> 1 then
    raise exception 'ABORTADO: ID 3 legado a preservar divergiu';
  end if;

  if (select count(*) from public.contas_fixas
      where id = 7
        and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
        and descricao = 'aluguel apartamento'
        and valor = 1947.64
        and dia_vencimento = 11
        and frequencia = 'Mensal'
        and ativo is true) <> 1 then
    raise exception 'ABORTADO: ID 7 canônico de Mauro divergiu';
  end if;

  if (select count(*) from public.contas_fixas
      where id = 4
        and empresa_id = '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid
        and descricao = 'ODONTO COMPANY'
        and valor = 59.90
        and dia_vencimento = 10
        and frequencia = 'Mensal'
        and ativo is true) <> 1 then
    raise exception 'ABORTADO: ID 4 de Karla divergiu';
  end if;

  if exists (
    select 1 from public.contas_fixas
    where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
      and regexp_replace(lower(btrim(descricao)), '[^a-z0-9]', '', 'g') = 'odontocompany'
      and valor = 49.90
      and dia_vencimento = 10
  ) then
    raise exception 'ABORTADO: obrigação ODONTOCOMPANY equivalente já existe em Mauro';
  end if;

  update public.contas_fixas
  set empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
  where id = 5
    and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
    and descricao = 'ODONTOCOMPANY'
    and valor = 49.90
    and dia_vencimento = 10
    and frequencia = 'Mensal'
    and ativo is true;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'ABORTADO: linhas alteradas %, esperado 1', v_count;
  end if;

  if (select count(*) from public.contas_fixas
      where id = 5
        and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
        and descricao = 'ODONTOCOMPANY'
        and valor = 49.90
        and dia_vencimento = 10
        and frequencia = 'Mensal'
        and ativo is true) <> 1
     or (select count(*) from public.contas_fixas
         where id = 3
           and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid) <> 1 then
    raise exception 'ABORTADO: validação interna de IDs 5/3 divergiu';
  end if;
end
$reassociar_conta_fixa_id5$;

commit;
