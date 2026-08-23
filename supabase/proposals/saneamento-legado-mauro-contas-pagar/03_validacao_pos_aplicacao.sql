-- PROPOSTA NÃO EXECUTADA. SOMENTE SELECTs.
select id, descricao, fornecedor, valor, vencimento, status, empresa_id
from public.contas_pagar
where id in (
  'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,
  '40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
  'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,
  'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid
)
order by id;

select
  (select count(*) from public.contas_pagar where id in (
    'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,
    '40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
    'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,
    'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid
  ) and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) as ids_mauro,
  (select count(*) from public.contas_pagar where id in (
    'c17314e1-8279-4157-bdef-76eb15c77c84'::uuid,
    '40091009-11fb-4c5c-ac63-24a7c4070428'::uuid,
    'fd37b52a-69a1-4ad3-91c5-514b88c1a49c'::uuid,
    'f9aa8622-1204-48c6-99e8-dae4eb1469bb'::uuid
  ) and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid) as ids_tenant_antigo;

