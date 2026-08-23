-- ROLLBACK PROPOSTO, NÃO EXECUTADO. Restaura o estado permissivo anterior.
-- As referências abaixo são à coluna legada public.despesas.user_id.
-- public.usuarios não possui user_id; sua identidade é public.usuarios.id = auth.uid().
-- Este rollback restaura exatamente as cinco policies antigas removidas pelo hardening.
begin;

do $$
declare v_policies text[];
begin
  select array_agg(policyname order by policyname) into v_policies from pg_policies where schemaname = 'public' and tablename = 'despesas';
  if v_policies is distinct from array['despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::text[] then
    raise exception 'Guard rollback: policies endurecidas divergiram: %', v_policies;
  end if;
end $$;

drop policy "despesas_delete_tenant" on public.despesas;
drop policy "despesas_insert_tenant" on public.despesas;
drop policy "despesas_select_tenant" on public.despesas;
drop policy "despesas_update_tenant" on public.despesas;

create policy "delete despesas user" on public.despesas for delete to public using (auth.uid() = despesas.user_id);
create policy "insert despesas user" on public.despesas for insert to public with check (auth.uid() = despesas.user_id);
create policy "liberar delete despesas" on public.despesas for delete to authenticated using (true);
create policy "liberar tudo despesas" on public.despesas for all to authenticated using (true) with check (true);
create policy "select despesas user" on public.despesas for select to public using (auth.uid() = despesas.user_id);

grant all privileges on table public.despesas to anon, authenticated;

do $$
declare v_policies text[];
begin
  select array_agg(policyname order by policyname) into v_policies from pg_policies where schemaname = 'public' and tablename = 'despesas';
  if v_policies is distinct from array['delete despesas user','insert despesas user','liberar delete despesas','liberar tudo despesas','select despesas user']::text[] then
    raise exception 'Validação rollback: conjunto antigo não foi restaurado exatamente: %', v_policies;
  end if;
end $$;
commit;
