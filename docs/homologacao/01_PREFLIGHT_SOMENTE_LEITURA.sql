-- ETAPA 0 / PREFLIGHT SOMENTE LEITURA.
-- Não altera schema, dados, Auth, Storage ou funções.
-- Executar futuramente SOMENTE no alvo homologação toiehtfotpjwjslpwdff.

begin read only;
set local statement_timeout = '30s';
set local lock_timeout = '3s';

-- P00: o operador deve conferir fora do SQL:
-- APP_ENV=homolog
-- EXPECTED_PROJECT_REF=toiehtfotpjwjslpwdff
-- ACTUAL_PROJECT_REF=toiehtfotpjwjslpwdff
-- PRODUCTION_PROJECT_REF=leissgrymkxakjvurric

-- P01: identidade lógica e modo da transação.
select current_database() as database_name,
       current_user as executing_role,
       current_setting('transaction_read_only') as transaction_read_only,
       current_setting('server_version') as server_version;

-- C01: relações públicas, RLS e contagem estimada (não lê dados de domínio).
select c.relname as relation_name,
       c.relkind,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       c.reltuples::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p','v','m','S')
order by c.relkind, c.relname;

-- C02: catálogo exato de colunas.
select table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default, is_identity, identity_generation,
       is_generated, generation_expression
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- C03: PKs, UNIQUEs, CHECKs e FKs com definição normalizada.
select c.relname as table_name, con.conname, con.contype,
       con.convalidated, con.condeferrable, con.condeferred,
       pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, con.contype, con.conname;

-- C04: colunas locais de cada constraint.
select tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.ordinal_position, kcu.column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_name = tc.table_name
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- C05: referências das FKs.
select tc.table_name, tc.constraint_name, kcu.column_name,
       ccu.table_name as foreign_table_name,
       ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- C06: índices e definições semânticas.
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- C07: triggers e funções associadas; exclui triggers internos.
select c.relname as table_name, t.tgname,
       t.tgenabled, t.tgdeferrable, t.tginitdeferred,
       p.oid::regprocedure::text as function_signature,
       pg_get_triggerdef(t.oid, true) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public' and not t.tgisinternal
order by c.relname, t.tgname;

-- C08: policies completas.
select schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- C09: assinaturas, segurança, search_path e ACL de funções públicas.
select p.proname,
       p.oid::regprocedure::text as identity_signature,
       pg_get_function_result(p.oid) as result_type,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       p.proacl as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, identity_signature;

-- C10a: grants de tabela para roles da API.
select grantee, table_name, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('PUBLIC','anon','authenticated','service_role')
order by grantee, table_name, privilege_type;

-- C10b: grants EXECUTE efetivos por assinatura.
select p.oid::regprocedure::text as identity_signature, r.rolname,
       has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and r.rolname in ('anon','authenticated','service_role')
order by identity_signature, r.rolname;

-- P02: oito tabelas a preservar e existência atual.
with expected(table_name) as (values
 ('empresas'),('usuarios'),('contas_fixas'),('despesas'),
 ('contas_pagar_pessoais'),('contas_pagar_pessoais_entradas'),
 ('contas_pagar_pessoais_grupo_metadados'),
 ('contas_pagar_pessoais_pagamento_eventos')
)
select e.table_name, c.oid is not null as exists_now,
       c.relrowsecurity as rls_enabled
from expected e
left join pg_class c on c.relname=e.table_name
 and c.relnamespace=(select oid from pg_namespace where nspname='public')
order by e.table_name;

-- P03: exclusões proibidas detectáveis no catálogo.
select c.relname as excluded_relation, c.relkind
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and (c.relname like '\_cf\_%' escape '\'
       or c.relname in ('relatorio_anual','relatorio_mensal'))
order by c.relname;

-- P04: divergência conhecida. Esperado: zero linhas.
select p.oid::regprocedure::text as unexpected_signature
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='provisionar_conta_v1';

-- P05: privilégios proibidos para roles da API. Esperado: zero linhas.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('anon','authenticated')
  and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES')
order by grantee, table_name, privilege_type;

rollback;
