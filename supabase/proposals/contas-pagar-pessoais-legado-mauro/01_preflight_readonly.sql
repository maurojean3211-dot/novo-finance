-- SOMENTE LEITURA. Escopo: 22 físicos; destino: 18 atuais + CPFL legada = 19.
select id, empresa_id, fornecedor, descricao, valor, vencimento, status, created_at
from public.contas_pagar
where empresa_id in ('8a85591b-2410-405f-8279-910dbcf61011'::uuid,'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid)
order by empresa_id, vencimento, id;

select empresa_id, status, count(*) quantidade, sum(valor) valor
from public.contas_pagar
where empresa_id in ('8a85591b-2410-405f-8279-910dbcf61011'::uuid,'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid)
group by empresa_id, status order by empresa_id, status;

-- Pares duplicados explícitos: legado -> canônico atual.
select legado.id legado_id, atual.id canonico_id, legado.fornecedor legado_fornecedor,
       atual.fornecedor canonico_fornecedor, legado.descricao legado_descricao,
       atual.descricao canonico_descricao, legado.valor, legado.vencimento,
       legado.status legado_status, atual.status canonico_status
from (values
 ('c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,'5921f97c-81cd-41ec-a347-3ab3e3c511d3'::uuid),
 ('f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid,'13bc39b3-b896-482c-b509-802f05cfc22c'::uuid),
 ('40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,'09dd7fb9-de2a-4e59-ab0d-b2bbbffded55'::uuid)
) pares(legado_id,canonico_id)
join public.contas_pagar legado on legado.id=pares.legado_id
join public.contas_pagar atual on atual.id=pares.canonico_id;

-- Esperado: 19; 15 Pago/R$ 7.893,16; 4 Pendente/R$ 2.289,57; total R$ 10.182,73.
select count(*) quantidade, status, sum(valor) valor
from public.contas_pagar
where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
   or id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid
group by rollup(status) order by status nulls last;

-- Deve retornar zero antes da primeira aplicação.
select source_legacy_id, empresa_id, proprietario_id
from public.contas_pagar_pessoais
where source_legacy_id in (select id from public.contas_pagar
  where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
     or id='fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid);
