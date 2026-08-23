-- VALIDAÇÃO SOMENTE LEITURA após eventual aplicação autorizada.
-- Identidade real: public.usuarios.id = auth.users.id = auth.uid().
select c.relrowsecurity as rls_habilitada, c.relforcerowsecurity as rls_forcada
from pg_class c where c.oid = 'public.despesas'::regclass;

select policyname, cmd, roles, permissive, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'despesas' order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'despesas' and grantee in ('anon', 'authenticated', 'PUBLIC')
order by grantee, privilege_type;

select empresa_id, tipo, count(*) as quantidade, sum(valor) as total
from public.despesas group by empresa_id, tipo order by empresa_id, tipo;

select count(*) as total,
       count(*) filter (where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) as tenant_mauro,
       count(*) filter (where empresa_id = '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid) as tenant_karla,
       count(*) filter (where empresa_id is null) as empresa_nula
from public.despesas;

select u.id as usuario_id, u.empresa_id, au.email,
       (u.id = au.id) as identidade_auth_compativel,
       (select count(*) from public.despesas d where d.empresa_id = u.empresa_id) as linhas_do_tenant
from public.usuarios u
join auth.users au on au.id = u.id
where u.empresa_id in ('8a85591b-2410-405f-8279-910dbcf61011'::uuid, '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid)
order by u.empresa_id, u.id;

-- Consolidação fail-closed esperada: somente quatro policies novas, nenhuma antiga,
-- dados intactos e predicado de tenant visível apenas ao usuário correto.
select
  (select count(*) from public.despesas) as total_registros,
  (select count(*) from public.despesas where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and tipo = 'receita') as receitas_mauro,
  (select coalesce(sum(valor), 0) from public.despesas where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and tipo = 'receita') as total_receitas_mauro,
  (select count(*) from public.despesas where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and tipo = 'despesa') as despesas_mauro,
  (select coalesce(sum(valor), 0) from public.despesas where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and tipo = 'despesa') as total_despesas_mauro,
  (select count(*) from public.despesas where empresa_id = '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid) as registros_karla,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'despesas') as policies_total,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'despesas' and policyname in ('delete despesas user','insert despesas user','liberar delete despesas','liberar tudo despesas','select despesas user')) as policies_antigas,
  (select array_agg(policyname order by policyname) from pg_policies where schemaname = 'public' and tablename = 'despesas') as policies_ativas,
  (select relrowsecurity from pg_class where oid = 'public.despesas'::regclass) as rls_habilitada,
  (select count(*) from public.despesas d where exists (select 1 from public.usuarios u where u.id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and u.empresa_id = d.empresa_id)) as visiveis_mauro_pelo_predicado,
  (select count(*) from public.despesas d where exists (select 1 from public.usuarios u where u.id = '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid and u.empresa_id = d.empresa_id)) as visiveis_karla_pelo_predicado,
  has_table_privilege('authenticated', 'public.despesas', 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', 'public.despesas', 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', 'public.despesas', 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', 'public.despesas', 'DELETE') as authenticated_delete,
  has_table_privilege('anon', 'public.despesas', 'SELECT') as anon_select,
  has_table_privilege('anon', 'public.despesas', 'INSERT') as anon_insert,
  has_table_privilege('anon', 'public.despesas', 'UPDATE') as anon_update,
  has_table_privilege('anon', 'public.despesas', 'DELETE') as anon_delete;
