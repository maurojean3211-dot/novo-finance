-- PROPOSAL — TESTES NÃO EXECUTADOS.
-- Usar somente ambiente controlado, identidades descartáveis e ROLLBACK.

select routine_schema,routine_name,grantee,privilege_type
from information_schema.role_routine_grants
where routine_schema='public' and routine_name='provisionar_conta_v1'
order by grantee,privilege_type;

-- Sem sessão deve falhar por grant/42501.
begin;
set local role anon;
select public.provisionar_conta_v1('Não deve criar',null,null);
rollback;

-- Usuário confirmado/autenticado, em fixture nova:
-- 1. chamar provisionar_conta_v1('Empresa Fixture','CPF','WhatsApp');
-- 2. confirmar uma empresa com user_id=auth.uid() e um perfil id=auth.uid();
-- 3. confirmar perfil cliente/usuario, master_admin=false, permissoes null e flags false;
-- 4. repetir e esperar resultado=existente sem novas linhas.

-- A assinatura não recebe empresa_id, role, master_admin ou permissoes.
select pg_catalog.pg_get_function_arguments(p.oid),
  pg_catalog.pg_get_function_result(p.oid),p.prosecdef,p.proconfig,
  pg_catalog.pg_get_userbyid(p.proowner) owner,
  pg_catalog.has_table_privilege(pg_catalog.pg_get_userbyid(p.proowner),'public.empresas','INSERT,SELECT') owner_empresas,
  pg_catalog.has_table_privilege(pg_catalog.pg_get_userbyid(p.proowner),'public.usuarios','INSERT,SELECT') owner_usuarios
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='provisionar_conta_v1';

-- Fixtures inconsistentes devem falhar integralmente:
-- perfil sem empresa; owner divergente; duas empresas do mesmo user_id;
-- email divergente do JWT; duas chamadas concorrentes.

-- Edge Function, somente após implementação:
-- usuário comum: LIST_USERS/INVITE_USER/UPDATE_PERMISSIONS => 403;
-- Karla tenant-admin não acessa Mauro;
-- Mauro com master_admin=true pode operar Karla somente com target explícito;
-- master global sem target_empresa_id => 400 e nenhuma consulta/mutação;
-- payload com empresa_id/role/nivel/master_admin em update => 400/403;
-- falha no perfil após invite => compensação deleteUser do convite novo;
-- DISABLE_USER e promoção/revogação de master_admin => ação inexistente/fail-closed;
-- cada operação autorizada deve gerar exatamente um registro de auditoria seguro.
