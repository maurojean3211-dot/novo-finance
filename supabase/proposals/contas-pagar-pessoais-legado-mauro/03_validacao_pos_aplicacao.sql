-- SOMENTE LEITURA. Esperado: 19 linhas, 15 pagas e 4 pendentes.
select id,empresa_id,proprietario_id,source_legacy_id,fornecedor,descricao,valor,vencimento,status,criado_em,atualizado_em
from public.contas_pagar_pessoais
where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid and proprietario_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
order by vencimento,id;

select count(*) quantidade,status,sum(valor) valor from public.contas_pagar_pessoais
where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid and proprietario_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
group by rollup(status) order by status nulls last;

select
 (select count(*) from public.contas_pagar_pessoais where source_legacy_id in ('c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid,'40091009-11fb-4c5c-ac63-24a7c4070428'::uuid)) duplicados_copiados,
 (select count(*) from public.contas_pagar_pessoais where source_legacy_id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid) cpfl_copiada,
 (select count(*) from public.contas_pagar where empresa_id in ('8a85591b-2410-405f-8279-910dbcf61011'::uuid,'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid)) origens_preservadas;

-- Deve retornar zero.
select empresa_id,proprietario_id,lower(btrim(coalesce(fornecedor,''))) fornecedor,lower(btrim(descricao)) descricao,valor,vencimento,count(*)
from public.contas_pagar_pessoais group by 1,2,3,4,5,6 having count(*)>1;
