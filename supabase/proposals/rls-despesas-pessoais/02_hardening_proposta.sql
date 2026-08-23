-- PROPOSTA NÃO EXECUTADA. Aplicar somente após autorização explícita.
-- Identidade real: public.usuarios.id = auth.users.id = auth.uid().
-- Escopo autorizado: remover exatamente as cinco policies antigas auditadas
-- e substituí-las pelas quatro policies de tenant abaixo.
begin;

do $$
declare v_policies text[];
begin
  if to_regclass('public.despesas') is null then raise exception 'Guard: public.despesas não existe'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.despesas'::regclass) then raise exception 'Guard: RLS deveria estar habilitada'; end if;
  if (select count(*) from public.despesas) <> 4
     or (select count(*) from public.despesas where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) <> 4
     or (select count(*) from public.despesas where empresa_id is null) <> 0
     or (select count(*) from public.despesas where user_id is null) <> 4 then
    raise exception 'Guard: estado físico de public.despesas divergiu';
  end if;
  if exists (select 1 from public.despesas d left join public.empresas e on e.id = d.empresa_id where e.id is null) then
    raise exception 'Guard: existe empresa_id inválido';
  end if;
  if not exists (
    select 1
    from public.usuarios u
    join auth.users au on au.id = u.id
    where u.id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
      and u.empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
      and au.email = 'maurojean3211@gmail.com'
  ) then
    raise exception 'Guard: associação de Mauro ao tenant atual não foi confirmada';
  end if;
  select array_agg(policyname order by policyname) into v_policies from pg_policies where schemaname = 'public' and tablename = 'despesas';
  if v_policies is distinct from array['delete despesas user','insert despesas user','liberar delete despesas','liberar tudo despesas','select despesas user']::text[] then
    raise exception 'Guard: conjunto de policies divergiu: %', v_policies;
  end if;
  if (select count(*) from pg_policies
      where schemaname = 'public' and tablename = 'despesas'
        and permissive = 'PERMISSIVE'
        and (
          (policyname = 'delete despesas user' and cmd = 'DELETE' and roles = array['public']::name[] and qual = '(auth.uid() = user_id)' and with_check is null)
          or (policyname = 'insert despesas user' and cmd = 'INSERT' and roles = array['public']::name[] and qual is null and with_check = '(auth.uid() = user_id)')
          or (policyname = 'liberar delete despesas' and cmd = 'DELETE' and roles = array['authenticated']::name[] and qual = 'true' and with_check is null)
          or (policyname = 'liberar tudo despesas' and cmd = 'ALL' and roles = array['authenticated']::name[] and qual = 'true' and with_check = 'true')
          or (policyname = 'select despesas user' and cmd = 'SELECT' and roles = array['public']::name[] and qual = '(auth.uid() = user_id)' and with_check is null)
        )) <> 5 then
    raise exception 'Guard: definição de uma ou mais policies antigas divergiu';
  end if;
end $$;

drop policy "delete despesas user" on public.despesas;
drop policy "insert despesas user" on public.despesas;
drop policy "liberar delete despesas" on public.despesas;
drop policy "liberar tudo despesas" on public.despesas;
drop policy "select despesas user" on public.despesas;

revoke all privileges on table public.despesas from public, anon, authenticated;
grant select, insert, update, delete on table public.despesas to authenticated;

create policy "despesas_select_tenant" on public.despesas for select to authenticated
using (exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id));
create policy "despesas_insert_tenant" on public.despesas for insert to authenticated
with check (exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id));
create policy "despesas_update_tenant" on public.despesas for update to authenticated
using (exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id))
with check (exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id));
create policy "despesas_delete_tenant" on public.despesas for delete to authenticated
using (exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id));

do $$
declare v_policies text[];
begin
  select array_agg(policyname order by policyname) into v_policies from pg_policies where schemaname = 'public' and tablename = 'despesas';
  if v_policies is distinct from array['despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::text[] then
    raise exception 'Validação: conjunto inesperado de policies: %', v_policies;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'despesas' and (qual = 'true' or with_check = 'true')) then raise exception 'Validação: policy ampla permaneceu ativa'; end if;
  if has_table_privilege('anon', 'public.despesas', 'SELECT') or has_table_privilege('anon', 'public.despesas', 'INSERT') or has_table_privilege('anon', 'public.despesas', 'UPDATE') or has_table_privilege('anon', 'public.despesas', 'DELETE') then raise exception 'Validação: anon ainda possui privilégio operacional'; end if;
end $$;

commit;
