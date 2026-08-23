-- FASE 16 CRM - VALIDACOES POS-MIGRATION - SOMENTE LEITURA
BEGIN TRANSACTION READ ONLY;

select table_name,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in ('crm_oportunidades','crm_oportunidade_historico')
order by table_name,ordinal_position;

select conrelid::regclass as tabela,conname,contype,pg_get_constraintdef(oid) as definicao
from pg_constraint where conrelid in ('public.crm_oportunidades'::regclass,'public.crm_oportunidade_historico'::regclass)
order by conrelid::regclass::text,conname;

select tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename in ('crm_oportunidades','crm_oportunidade_historico')
order by tablename,policyname;

select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('crm_oportunidades','crm_oportunidade_historico');

select event_object_table,trigger_name,event_manipulation,action_timing,action_statement
from information_schema.triggers where event_object_schema='public' and event_object_table in ('crm_oportunidades','crm_oportunidade_historico')
order by event_object_table,trigger_name;

-- Esperado: zero policies integralmente TRUE.
select tablename,policyname from pg_policies
where schemaname='public' and tablename in ('crm_oportunidades','crm_oportunidade_historico')
and (lower(trim(both ' ()' from coalesce(qual,'')))='true' or lower(trim(both ' ()' from coalesce(with_check,'')))='true');

ROLLBACK;
