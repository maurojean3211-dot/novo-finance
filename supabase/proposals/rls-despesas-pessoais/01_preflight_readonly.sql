-- PREFLIGHT SOMENTE LEITURA. Não altera dados, schema, grants ou policies.

select c.relrowsecurity as rls_habilitada, c.relforcerowsecurity as rls_forcada
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'despesas';

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'despesas'
order by ordinal_position;

select conname, contype, pg_get_constraintdef(oid) as definicao
from pg_constraint where conrelid = 'public.despesas'::regclass order by conname;

select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'despesas' order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'despesas'
order by grantee, privilege_type;

select empresa_id, tipo, count(*) as quantidade, sum(valor) as total
from public.despesas group by empresa_id, tipo order by empresa_id, tipo;

select count(*) as total,
       count(*) filter (where d.empresa_id is null) as empresa_nula,
       count(*) filter (where d.user_id is null) as user_nulo,
       count(*) filter (where d.empresa_id is not null and e.id is null) as empresa_inexistente,
       count(*) filter (where d.user_id is not null and (u.id is null or u.empresa_id is distinct from d.empresa_id)) as usuario_tenant_divergente
from public.despesas d
left join public.empresas e on e.id = d.empresa_id
left join public.usuarios u on u.id = d.user_id;

-- No modelo real, public.usuarios.id é o mesmo UUID de auth.users.id.
-- Não existe public.usuarios.user_id.
select u.id as usuario_id, u.empresa_id, au.email,
       (u.id = au.id) as identidade_auth_compativel
from public.usuarios u
join auth.users au on au.id = u.id
where u.empresa_id in ('8a85591b-2410-405f-8279-910dbcf61011'::uuid, '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid)
order by u.empresa_id, u.id;

select
  count(*) filter (where d.empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) as visiveis_mauro,
  count(*) filter (where d.empresa_id = '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid) as visiveis_karla
from public.despesas d;

-- Resultado consolidado fail-closed esperado antes do hardening.
select
  count(*) as total_registros,
  count(*) filter (where d.empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and d.tipo = 'receita') as receitas_mauro,
  coalesce(sum(d.valor) filter (where d.empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and d.tipo = 'receita'), 0) as total_receitas_mauro,
  count(*) filter (where d.empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and d.tipo = 'despesa') as despesas_mauro,
  coalesce(sum(d.valor) filter (where d.empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid and d.tipo = 'despesa'), 0) as total_despesas_mauro,
  count(*) filter (where d.empresa_id = '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid) as registros_karla,
  count(*) filter (where d.empresa_id is null) as empresa_nula,
  count(*) filter (where d.empresa_id is not null and e.id is null) as empresa_inexistente,
  count(*) filter (where d.empresa_id is not null and not exists (
    select 1 from public.usuarios u
    join auth.users au on au.id = u.id
    where u.empresa_id = d.empresa_id
  )) as sem_usuario_auth_no_tenant,
  exists (
    select 1 from public.usuarios u
    join auth.users au on au.id = u.id
    where u.id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
      and u.empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
      and au.email = 'maurojean3211@gmail.com'
  ) as identidade_mauro_valida
from public.despesas d
left join public.empresas e on e.id = d.empresa_id;
