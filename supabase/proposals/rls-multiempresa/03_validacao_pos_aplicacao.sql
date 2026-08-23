-- PROPOSAL — NÃO EXECUTAR AGORA.
-- Roteiro para ambiente controlado após eventual aplicação autorizada.

-- 1. Estado estrutural esperado: Fase 1 ON; parcelas permanece OFF; FORCE permanece false.
select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
 ('empresas','usuarios','clientes','contas_fixas','emprestimos','parcelas','recebimentos') order by c.relname;
select tablename,policyname,cmd,roles,permissive,qual,with_check from pg_catalog.pg_policies
where schemaname='public' and tablename in
 ('empresas','usuarios','clientes','contas_fixas','emprestimos','parcelas','recebimentos')
order by tablename,policyname;

-- 2. Policies antigas abertas devem retornar zero linhas.
select tablename,policyname from pg_catalog.pg_policies where schemaname='public' and (
 (tablename='usuarios' and policyname in ('liberar insert usuarios','liberar leitura usuarios','update usuarios master','usuario_proprio','Usuários veem o próprio perfil','Usuários podem ver seus próprios dados','Usuários atualizam o próprio perfil','Usuários podem atualizar seu próprio PIX'))
 or (tablename='clientes' and policyname in ('liberar tudo clientes','empresa_clientes','select clientes','insert clientes','update clientes','delete clientes','clientes da empresa','Clientes por empresa'))
 or (tablename='emprestimos' and policyname in ('Gerenciar empréstimos da própria empresa','liberar emprestimos','liberar tudo')));

-- empresas deve ter exatamente as duas policies v1, sem permissiva residual.
select count(*)=2 and bool_and(policyname in ('empresas_select_tenant_v1','empresas_update_tenant_v1'))
  as empresas_policies_exatas
from pg_catalog.pg_policies where schemaname='public' and tablename='empresas';

-- 3. Grants: anon deve ter zero; authenticated somente os DML propostos.
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in
 ('empresas','usuarios','clientes','contas_fixas','emprestimos','recebimentos')
 and grantee in ('anon','authenticated','PUBLIC')
order by table_name,grantee,privilege_type;
select table_name,has_table_privilege('anon',format('public.%I',table_name),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') anon_tem_acesso,
 has_table_privilege('authenticated',format('public.%I',table_name),'TRUNCATE,REFERENCES,TRIGGER') authenticated_tem_admin
from unnest(array['empresas','usuarios','clientes','contas_fixas','emprestimos','recebimentos']) table_name;

-- 4. Usuário comum: executar com fixture descartável e ROLLBACK.
-- Confirmar: SELECT próprio=1; SELECT alheio=0; UPDATE próprio de pix/pix_chave funciona;
-- UPDATE de empresa_id/role/tipo_usuario/nivel/master_admin/permissoes/isento e flags falha 42501;
-- UPDATE alheio afeta 0; DELETE/INSERT diretos não são concedidos.
-- Cadastro confirmado chama provisionar_conta_v1; repetição é idempotente e nenhum
-- parâmetro permite empresa_id, role, master_admin, permissoes ou flags.

-- 5. Mauro: substituir <AUTH_USER_ID_MAURO> pelo auth.users.id confirmado no preflight.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','<AUTH_USER_ID_MAURO>',true);
select 'Mauro/clientes' teste,count(*) from public.clientes;
select 'Mauro/contas_fixas' teste,count(*) from public.contas_fixas;
select 'Mauro/emprestimos' teste,count(*) from public.emprestimos;
select 'Mauro/recebimentos' teste,count(*) from public.recebimentos;
select 'Mauro não vê Karla/clientes' teste,count(*) from public.clientes
 where empresa_id='3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid;
select 'Mauro não vê Karla/contas' teste,count(*) from public.contas_fixas
 where empresa_id='3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid;
select 'Mauro não vê Karla/emprestimos' teste,count(*) from public.emprestimos
 where empresa_id='3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid;
select 'Mauro não vê Karla/recebimentos' teste,count(*) from public.recebimentos
 where empresa_id='3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid;
rollback;

-- 6. Karla: auth user id previamente confirmado no inventário remoto.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','c7670555-a2d7-4d03-b922-6fb5e7f87e7a',true);
select 'Karla/clientes' teste,count(*) from public.clientes;
select 'Karla/contas_fixas' teste,count(*) from public.contas_fixas;
select 'Karla/emprestimos' teste,count(*) from public.emprestimos;
select 'Karla/recebimentos' teste,count(*) from public.recebimentos;
select 'Karla não vê Mauro/clientes' teste,count(*) from public.clientes
 where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid;
select 'Karla não vê Mauro/contas' teste,count(*) from public.contas_fixas
 where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid;
select 'Karla não vê Mauro/emprestimos' teste,count(*) from public.emprestimos
 where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid;
select 'Karla não vê Mauro/recebimentos' teste,count(*) from public.recebimentos
 where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid;
rollback;

-- 7. DML cross-tenant, somente com fixtures descartáveis e sempre ROLLBACK:
-- a) INSERT em cada tabela com empresa_id alheio deve falhar por WITH CHECK;
-- b) UPDATE de empresa_id deve falhar;
-- c) UPDATE de linha alheia deve afetar 0;
-- d) DELETE de linha alheia deve afetar 0;
-- e) recebimento com venda inexistente ou venda de outro tenant deve falhar;
-- f) recebimento válido do próprio tenant deve funcionar.

-- 8. Guard nominal e coluna inexistente.
select tg.tgname,pg_get_triggerdef(tg.oid,true) from pg_catalog.pg_trigger tg
where tg.tgrelid='public.usuarios'::regclass and not tg.tgisinternal;
select column_name from information_schema.columns
where table_schema='public' and table_name='usuarios' and column_name='is_admin';
select tg.tgname,pg_get_triggerdef(tg.oid,true) from pg_catalog.pg_trigger tg
where tg.tgrelid='public.empresas'::regclass and not tg.tgisinternal;

-- 9. MasterAdmin: testes ficam BLOQUEADOS até Edge Function e auditoria existirem.
-- Validar LIST_USERS/INVITE_USER/UPDATE_PERMISSIONS; DISABLE_USER fica fora da v1.
-- Confirmar usuário comum negado, tenant-admin próprio e Mauro global somente com target.

-- 10. empresas: somente após inventário nominal e seção concreta integrada.
-- Confirmar SELECT próprio, UPDATE próprio permitido somente nos campos funcionais,
-- INSERT/DELETE direto negados, Karla não vê Mauro e Mauro tenant não vê Karla.
-- O master_admin global acessa empresas apenas pela Edge Function, sempre com target.
