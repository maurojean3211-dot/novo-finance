-- SOMENTE LEITURA. Não altera schema, dados ou RLS.
select c.relrowsecurity rls_habilitada,c.relforcerowsecurity force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='contas_pagar_pessoais';

select column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name='contas_pagar_pessoais'
order by ordinal_position;

select policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename='contas_pagar_pessoais' order by policyname;

select conname,pg_get_constraintdef(oid) definicao from pg_constraint
where conrelid='public.contas_pagar_pessoais'::regclass order by conname;

select indexname,indexdef from pg_indexes
where schemaname='public' and tablename='contas_pagar_pessoais' order by indexname;

select count(*) total_registros,
 count(*) filter(where status='Pago') pagos,
 count(*) filter(where status='Pendente') pendentes,
 count(*) filter(where status='Cancelada') canceladas,
 sum(valor) total_valor,
 count(*) filter(where source_legacy_id is not null) com_source_legacy_id,
 count(distinct source_legacy_id) filter(where source_legacy_id is not null) sources_distintos,
 count(*) filter(where empresa_id is null or proprietario_id is null) escopo_nulo
from public.contas_pagar_pessoais;

-- Esperado: 0 colunas e RPC nula antes da aplicação.
select count(*) filter(where column_name in (
 'grupo_parcelamento_id','parcela_numero','parcelas_total',
 'valor_total_compra','periodicidade','idempotency_key')) colunas_parcelamento_existentes,
 to_regprocedure('public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text)') rpc_existente
from information_schema.columns
where table_schema='public' and table_name='contas_pagar_pessoais';

