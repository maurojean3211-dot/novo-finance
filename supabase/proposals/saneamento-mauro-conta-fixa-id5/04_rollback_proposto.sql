-- ROLLBACK DE CONTINGÊNCIA. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
begin;

do $rollback_conta_fixa_id5$
declare
  v_count integer;
begin
  if (select count(*) from public.contas_fixas
      where id = 5
        and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
        and descricao = 'ODONTOCOMPANY'
        and valor = 49.90
        and dia_vencimento = 10
        and frequencia = 'Mensal'
        and ativo is true) <> 1 then
    raise exception 'ABORTADO: ID 5 não está exatamente no estado pós-aplicação';
  end if;

  update public.contas_fixas
  set empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
  where id = 5
    and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
    and descricao = 'ODONTOCOMPANY'
    and valor = 49.90
    and dia_vencimento = 10
    and frequencia = 'Mensal'
    and ativo is true;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'ABORTADO: rollback alterou %, esperado 1', v_count;
  end if;
end
$rollback_conta_fixa_id5$;

commit;
