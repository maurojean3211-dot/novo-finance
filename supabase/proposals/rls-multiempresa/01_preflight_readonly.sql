-- PROPOSAL RLS — PREFLIGHT SOMENTE LEITURA. NÃO EXECUTADO.
-- Todo resultado divergente do inventário abaixo deve bloquear a aplicação futura.

-- Estado RLS remoto esperado antes da Fase 1.
with expected(table_name,expected_rls,expected_force) as (values
 ('usuarios',true,false),('clientes',true,false),('contas_fixas',false,false),
 ('emprestimos',false,false),('parcelas',false,false),('recebimentos',false,false))
select e.*,c.oid is not null as exists,c.relrowsecurity actual_rls,c.relforcerowsecurity actual_force,
 (c.oid is not null and c.relrowsecurity=e.expected_rls and c.relforcerowsecurity=e.expected_force) matches_expected
from expected e left join pg_catalog.pg_namespace n on n.nspname='public'
left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.table_name and c.relkind in ('r','p')
order by e.table_name;

-- As 19 policies nominais esperadas, incluindo expressão completa.
with expected(table_name,policy_name) as (values
 ('usuarios','liberar insert usuarios'),('usuarios','liberar leitura usuarios'),('usuarios','update usuarios master'),
 ('usuarios','usuario_proprio'),('usuarios','Usuários veem o próprio perfil'),
 ('usuarios','Usuários podem ver seus próprios dados'),('usuarios','Usuários atualizam o próprio perfil'),
 ('usuarios','Usuários podem atualizar seu próprio PIX'),('clientes','liberar tudo clientes'),
 ('clientes','empresa_clientes'),('clientes','select clientes'),('clientes','insert clientes'),
 ('clientes','update clientes'),('clientes','delete clientes'),('clientes','clientes da empresa'),
 ('clientes','Clientes por empresa'),('emprestimos','Gerenciar empréstimos da própria empresa'),
 ('emprestimos','liberar emprestimos'),('emprestimos','liberar tudo'))
select e.table_name,e.policy_name,p.cmd,p.roles,p.permissive,p.qual,p.with_check,p.policyname is not null as exists
from expected e left join pg_catalog.pg_policies p
 on p.schemaname='public' and p.tablename=e.table_name and p.policyname=e.policy_name
order by e.table_name,e.policy_name;
select tablename,policyname,cmd,roles,permissive,qual,with_check
from pg_catalog.pg_policies where schemaname='public'
 and tablename in ('usuarios','clientes','contas_fixas','emprestimos','parcelas','recebimentos')
order by tablename,policyname;

-- Todas as 25 colunas reais de usuarios; is_admin deve retornar zero linhas.
select ordinal_position,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns where table_schema='public' and table_name='usuarios'
order by ordinal_position;
select column_name from information_schema.columns
where table_schema='public' and table_name='usuarios' and column_name='is_admin';

-- Colunas de ownership e relacionamentos das demais tabelas.
select table_name,ordinal_position,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns where table_schema='public'
 and table_name in ('clientes','contas_fixas','emprestimos','parcelas','recebimentos','vendas')
 and column_name in ('id','empresa_id','user_id','cliente_id','venda_id','emprestimo_id','historico')
order by table_name,ordinal_position;

-- Constraints e triggers reais.
select con.conrelid::regclass tabela,con.conname,con.contype,pg_get_constraintdef(con.oid,true) definicao
from pg_catalog.pg_constraint con where con.connamespace='public'::regnamespace
 and con.conrelid in ('public.usuarios'::regclass,'public.clientes'::regclass,'public.contas_fixas'::regclass,
 'public.emprestimos'::regclass,'public.parcelas'::regclass,'public.recebimentos'::regclass)
order by tabela::text,con.conname;
select tg.tgrelid::regclass tabela,tg.tgname,pg_get_triggerdef(tg.oid,true) definicao
from pg_catalog.pg_trigger tg where not tg.tgisinternal
 and tg.tgrelid in ('public.usuarios'::regclass,'public.clientes'::regclass,'public.contas_fixas'::regclass,
 'public.emprestimos'::regclass,'public.parcelas'::regclass,'public.recebimentos'::regclass)
order by tabela::text,tg.tgname;

-- Empresas oficiais e usuários vinculados. Não exibe dados pessoais desnecessários.
select id,name,user_id from public.empresas where id in
 ('3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid,'8a85591b-2410-405f-8279-910dbcf61011'::uuid) order by id;
select id,empresa_id,role,tipo_usuario,nivel,master_admin from public.usuarios where empresa_id in
 ('3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid,'8a85591b-2410-405f-8279-910dbcf61011'::uuid)
order by empresa_id,id;

-- Nenhuma tabela que entra na Fase 1 pode conter empresa_id NULL.
select 'usuarios' tabela,count(*) total,count(*) filter(where empresa_id is null) null_empresa_id from public.usuarios
union all select 'clientes',count(*),count(*) filter(where empresa_id is null) from public.clientes
union all select 'contas_fixas',count(*),count(*) filter(where empresa_id is null) from public.contas_fixas
union all select 'emprestimos',count(*),count(*) filter(where empresa_id is null) from public.emprestimos
union all select 'recebimentos',count(*),count(*) filter(where empresa_id is null) from public.recebimentos
union all select 'parcelas',count(*),count(*) filter(where empresa_id is null) from public.parcelas;

-- Recebimentos: deve haver zero venda ausente e zero divergência de tenant.
select count(*) total,
 count(*) filter(where r.venda_id is null) venda_id_null,
 count(*) filter(where r.venda_id is not null and v.id is null) venda_orfa,
 count(*) filter(where v.id is not null and v.empresa_id is distinct from r.empresa_id) tenant_divergente
from public.recebimentos r left join public.vendas v on v.id=r.venda_id;

-- Grants reais: atualmente amplos; preservar esta saída antes de qualquer aplicação.
select grantee,table_name,privilege_type,is_grantable from information_schema.role_table_grants
where table_schema='public' and table_name in
 ('usuarios','clientes','contas_fixas','emprestimos','parcelas','recebimentos')
 and grantee in ('anon','authenticated','service_role','PUBLIC')
order by table_name,grantee,privilege_type;
select grantee,table_name,column_name,privilege_type,is_grantable
from information_schema.column_privileges where table_schema='public'
 and table_name='usuarios' and grantee in ('anon','authenticated','service_role','PUBLIC')
order by grantee,column_name,privilege_type;

-- empresas passa a ser requisito da Fase 1 integrada. Este inventário nominal é
-- obrigatório antes de escrever qualquer DROP/CREATE de policy para a tabela.
select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='empresas' and c.relkind in ('r','p');
select tablename,policyname,cmd,roles,permissive,qual,with_check
from pg_catalog.pg_policies
where schemaname='public' and tablename='empresas'
order by policyname;
select grantee,table_name,privilege_type,is_grantable
from information_schema.role_table_grants
where table_schema='public' and table_name='empresas'
order by grantee,privilege_type;
select e.user_id,count(*) quantidade,array_agg(e.id order by e.id) empresas
from public.empresas e where e.user_id is not null
group by e.user_id having count(*)>1;
select u.id usuario_id,u.empresa_id,e.user_id empresa_owner
from public.usuarios u left join public.empresas e on e.id=u.empresa_id
where e.id is null or (e.user_id is not null and e.user_id is distinct from u.id);

-- Decisão formal: deve identificar exatamente o perfil de Mauro esperado para
-- master_admin global, sem alterar nenhum dado neste preflight.
select u.id,u.empresa_id,u.role,u.master_admin
from public.usuarios u
where u.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid;

-- Parcelas permanece fora: tabela vazia, RLS off e ownership misto devem ser reconfirmados.
select count(*) total,count(*) filter(where empresa_id is null) null_empresa_id,
 count(distinct empresa_id) empresas_distintas from public.parcelas;
