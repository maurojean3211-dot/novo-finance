-- SOMENTE LEITURA.
select column_name,data_type,is_nullable from information_schema.columns
where table_schema='public' and table_name='contas_pagar_pessoais_grupo_metadados'
order by ordinal_position;
select policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename='contas_pagar_pessoais_grupo_metadados';
select p.oid::regprocedure,p.prosecdef,p.proconfig from pg_proc p
where p.oid='public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,bigint,text,text,text,text,text)'::regprocedure;
select count(*) cabecalhos from public.contas_pagar_pessoais_grupo_metadados;
select count(*) parcelas,sum(valor) total,count(*) filter(where status='Pago') pagas
from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid;
