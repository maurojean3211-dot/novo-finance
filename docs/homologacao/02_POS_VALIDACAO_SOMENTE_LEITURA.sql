-- ETAPA 0 / PÓS-VALIDAÇÃO SOMENTE LEITURA.
-- Documento para uma etapa futura; não executar nesta etapa.

begin read only;
set local statement_timeout = '30s';
set local lock_timeout = '3s';

-- V00: confirmação da barreira read-only.
select current_database() as database_name,
       current_user as executing_role,
       current_setting('transaction_read_only') as transaction_read_only;

-- V01: totais estruturais finais. Comparar com o manifesto aprovado, não
-- simplesmente com os totais de produção (objetos técnicos/legados são excluídos).
select
 count(*) filter (where c.relkind in ('r','p')) as tables,
 count(*) filter (where c.relkind='v') as views,
 count(*) filter (where c.relkind='m') as materialized_views,
 count(*) filter (where c.relkind='S') as sequences,
 count(*) filter (where c.relkind in ('r','p') and c.relrowsecurity) as rls_tables
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public';

-- V02: fingerprint de colunas e catálogo detalhado.
select md5(string_agg(
 table_name||'|'||ordinal_position||'|'||column_name||'|'||data_type||'|'||udt_name||'|'||
 is_nullable||'|'||coalesce(column_default,'')||'|'||is_identity||'|'||is_generated,
 E'\n' order by table_name, ordinal_position)) as columns_fingerprint,
 count(*) as columns_count
from information_schema.columns where table_schema='public';

select table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default, is_identity, is_generated
from information_schema.columns where table_schema='public'
order by table_name, ordinal_position;

-- V03/V04/V05: constraints, colunas e referências.
select c.relname as table_name, con.conname, con.contype, con.convalidated,
       pg_get_constraintdef(con.oid,true) as definition
from pg_constraint con
join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
order by c.relname, con.contype, con.conname;

select tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.ordinal_position, kcu.column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema=tc.constraint_schema
 and kcu.constraint_name=tc.constraint_name
 and kcu.table_name=tc.table_name
where tc.table_schema='public'
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

select tc.table_name, tc.constraint_name, kcu.column_name,
       ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema=tc.constraint_schema and ccu.constraint_name=tc.constraint_name
where tc.table_schema='public' and tc.constraint_type='FOREIGN KEY'
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- V06: índices.
select tablename,indexname,indexdef from pg_indexes
where schemaname='public' order by tablename,indexname;

-- V07: triggers.
select c.relname as table_name,t.tgname,t.tgenabled,t.tgdeferrable,t.tginitdeferred,
       p.oid::regprocedure::text as function_signature,
       pg_get_triggerdef(t.oid,true) as definition
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where n.nspname='public' and not t.tgisinternal
order by c.relname,t.tgname;

-- V08: RLS e policies; qualquer tabela de negócio sem RLS é falha.
select c.relname as table_without_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
  and not c.relrowsecurity
  and c.relname not like '\_cf\_%' escape '\'
order by c.relname;

select tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
order by tablename,policyname;

-- V09: 30 RPCs do contrato do frontend; provisionar_conta_v1 deve continuar
-- explicitamente marcada como divergência até decisão separada.
with required(name) as (values
 ('alterar_status_pedido_compra'),('apontar_resultado_operacao_producao'),
 ('atualizar_metadados_grupo_conta_pessoal'),('baixar_reserva_estoque'),
 ('baixar_titulo_financeiro'),('conciliar_titulo_financeiro'),('confirmar_recebimento'),
 ('converter_prospecto_comercial'),('criar_parcelamento_conta_pessoal'),
 ('criar_parcelamento_conta_pessoal_com_entrada'),('editar_titulo_financeiro'),
 ('estornar_baixa_financeira'),('estornar_pagamento_conta_pessoal'),
 ('excluir_nota_fiscal_tributaria'),('finalizar_inventario'),
 ('gerar_titulos_recorrentes'),('importar_nota_fiscal_tributaria'),
 ('movimentar_estoque'),('provisionar_conta_v1'),('receber_item_pedido'),
 ('registrar_configuracao_tributaria'),('registrar_decisao_orcamento'),
 ('registrar_evento_operacao_producao'),('registrar_pagamento_conta_pessoal'),
 ('registrar_titulo_financeiro'),('registrar_verificacao_tributaria'),
 ('reordenar_fila_producao'),('revisar_nota_fiscal_tributaria'),
 ('salvar_cotacao_pedido_compra'),('sincronizar_parcelas_pedido_compra')
)
select r.name,
       coalesce(jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
                filter (where p.oid is not null),'[]'::jsonb) as signatures,
       case when r.name='provisionar_conta_v1' then 'DIVERGENCIA_NAO_IMPLEMENTAR'
            when count(p.oid)=0 then 'AUSENTE' else 'PRESENTE' end as status
from required r
left join pg_proc p on p.proname=r.name
 and p.pronamespace=(select oid from pg_namespace where nspname='public')
group by r.name order by r.name;

-- V10: grants proibidos e EXECUTE efetivo.
select grantee,table_name,privilege_type
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
  and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES')
order by grantee,table_name,privilege_type;

select p.oid::regprocedure::text as identity_signature,r.rolname,
       has_function_privilege(r.rolname,p.oid,'EXECUTE') as can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join pg_roles r
where n.nspname='public' and r.rolname in ('anon','authenticated','service_role')
order by identity_signature,r.rolname;

-- V11: objetos explicitamente excluídos. Esperado: zero linhas.
select c.relname,c.relkind
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and (c.relname like '\_cf\_%' escape '\'
       or c.relname in ('relatorio_anual','relatorio_mensal'))
order by c.relname;

-- V12: nenhuma FK inválida deve permanecer após a etapa específica de validação.
select c.relname as table_name,con.conname,pg_get_constraintdef(con.oid,true) definition
from pg_constraint con
join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and con.contype='f' and not con.convalidated
order by c.relname,con.conname;

rollback;
