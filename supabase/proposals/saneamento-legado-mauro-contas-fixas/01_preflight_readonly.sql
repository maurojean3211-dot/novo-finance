-- PROPOSTA NÃO EXECUTADA. SOMENTE SELECTs.
select id, name, user_id
from public.empresas
where id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid;

select id, descricao, valor, dia_vencimento, frequencia, empresa_id
from public.contas_fixas
where id in (3, 5)
order by id;

select
  (select count(*) from public.empresas
   where id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) as empresas_mauro,
  (select count(*) from public.contas_fixas where id in (3, 5)) as ids_encontrados,
  (select count(*) from public.contas_fixas
   where id in (3, 5)
     and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid) as ids_no_tenant_antigo,
  (select count(*) from public.contas_fixas
   where (id = 3 and descricao = 'ALUGUEL APARTAMENTO')
      or (id = 5 and descricao = 'ODONTOCOMPANY')) as descricoes_confirmadas;
