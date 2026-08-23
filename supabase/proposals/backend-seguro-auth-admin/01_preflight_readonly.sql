-- PROPOSAL BACKEND SEGURO — PREFLIGHT SOMENTE LEITURA. NÃO EXECUTADO.
-- Qualquer divergência deve interromper a revisão/aplicação futura.

with expected(table_name,column_name,data_type) as (values
  ('usuarios','id','uuid'),('usuarios','email','text'),('usuarios','nome','text'),
  ('usuarios','empresa_id','uuid'),('usuarios','role','text'),
  ('usuarios','tipo_usuario','text'),('usuarios','nivel','text'),
  ('usuarios','master_admin','boolean'),('usuarios','permissoes','jsonb'),
  ('usuarios','isento','boolean'),('usuarios','pode_financeiro','boolean'),
  ('usuarios','pode_emprestimos','boolean'),('usuarios','pode_compras','boolean'),
  ('usuarios','pode_vendas','boolean'),('usuarios','pode_contas_pagar','boolean'),
  ('usuarios','financeiro','boolean'),('usuarios','emprestimos','boolean'),
  ('usuarios','vendas','boolean'),('usuarios','compras','boolean'),
  ('usuarios','contas_pagar','boolean'),
  ('empresas','id','uuid'),('empresas','user_id','uuid'),('empresas','name','text'),
  ('empresas','email','text'),('empresas','cpf','text'),('empresas','whatsapp','text'),
  ('empresas','plano','text'),('empresas','status','text')
)
select e.*,c.column_name is not null as exists,c.data_type actual_type,
  c.column_name is not null and c.data_type=e.data_type as matches_expected
from expected e left join information_schema.columns c
  on c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
order by e.table_name,e.column_name;

select table_name,ordinal_position,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns where table_schema='public'
  and table_name in ('usuarios','empresas') order by table_name,ordinal_position;
select con.conrelid::regclass tabela,con.conname,con.contype,
  pg_catalog.pg_get_constraintdef(con.oid,true) definicao
from pg_catalog.pg_constraint con where con.connamespace='public'::regnamespace
  and con.conrelid in ('public.usuarios'::regclass,'public.empresas'::regclass)
order by tabela::text,con.conname;
select tg.tgrelid::regclass tabela,tg.tgname,pg_catalog.pg_get_triggerdef(tg.oid,true) definicao
from pg_catalog.pg_trigger tg where not tg.tgisinternal
  and tg.tgrelid in ('public.usuarios'::regclass,'public.empresas'::regclass)
order by tabela::text,tg.tgname;

-- Inconsistências que bloqueiam o provisionamento.
select u.id usuario_id,u.empresa_id,'perfil_sem_empresa_valida' problema
from public.usuarios u left join public.empresas e on e.id=u.empresa_id
where u.empresa_id is null or e.id is null
union all
select u.id,u.empresa_id,'empresa_owner_divergente'
from public.usuarios u join public.empresas e on e.id=u.empresa_id
where e.user_id is not null and e.user_id is distinct from u.id;
select e.user_id,count(*) quantidade,array_agg(e.id order by e.id) empresas
from public.empresas e where e.user_id is not null
group by e.user_id having count(*)>1;

-- Não presume legitimidade global de nenhum usuário.
select id,empresa_id,role,master_admin from public.usuarios
where master_admin=true or role='master'
order by master_admin desc,empresa_id,id;

-- Decisão funcional formal: identificar o único perfil candidato de Mauro.
-- O preflight não altera master_admin.
select u.id,u.empresa_id,u.role,u.master_admin
from public.usuarios u
where u.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid;
select u.id,u.empresa_id,u.role,u.master_admin
from public.usuarios u
where u.empresa_id='3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid;

-- Objetos/grants homônimos devem estar ausentes antes da primeira aplicação.
select n.nspname schema_name,p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) identity_arguments,
  pg_catalog.pg_get_userbyid(p.proowner) owner,p.prosecdef security_definer,p.proconfig
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='provisionar_conta_v1';
select routine_schema,routine_name,grantee,privilege_type
from information_schema.role_routine_grants
where routine_schema='public' and routine_name='provisionar_conta_v1'
order by grantee,privilege_type;

select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('usuarios','empresas');
select grantee,table_name,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('usuarios','empresas')
order by table_name,grantee,privilege_type;
