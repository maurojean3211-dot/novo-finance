-- FASE 16 CRM - PREFLIGHT SOMENTE LEITURA - NAO EXECUTAR COMO MIGRATION
BEGIN TRANSACTION READ ONLY;

-- As duas tabelas devem estar ausentes antes da primeira aplicacao.
select to_regclass('public.crm_oportunidades') as crm_oportunidades,
       to_regclass('public.crm_oportunidade_historico') as crm_oportunidade_historico;

-- Tipos obrigatorios da arquitetura. Esperado: uuid nas quatro linhas.
select table_schema,table_name,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns
where (table_schema,table_name,column_name) in (
 ('public','empresas','id'),
 ('public','usuarios','id'),
 ('public','usuarios','empresa_id'),
 ('public','clientes','id')
)
order by table_name,column_name;

-- FKs-base esperadas e regras de exclusao atuais.
select conrelid::regclass as tabela,conname,pg_get_constraintdef(oid) as definicao
from pg_constraint
where contype='f' and conrelid in ('public.usuarios'::regclass,'public.clientes'::regclass)
order by conrelid::regclass::text,conname;

-- Confirma tenants e perfis operacionais sem usar e-mail.
select e.id,e.name from public.empresas e
where e.id in ('8a85591b-2410-405f-8279-910dbcf61011'::uuid,'3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid)
order by e.id;
select u.id,u.empresa_id from public.usuarios u
where (u.id='8a85591b-2410-405f-8279-910dbcf61011'::uuid and u.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)
   or (u.id='c7670555-a2d7-4d03-b922-6fb5e7f87e7a'::uuid and u.empresa_id='3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid);

-- Detecta conflitos nominais antes da migration.
select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('crm_set_updated_at','crm_protect_opportunity_scope');

ROLLBACK;
