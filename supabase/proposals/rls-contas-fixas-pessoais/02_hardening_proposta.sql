-- PROPOSTA LOCAL. NÃO EXECUTAR SEM AUTORIZAÇÃO ESPECÍFICA.
begin;

do $guard$
begin
  if (select count(*) from public.contas_fixas where empresa_id is null) <> 0 then
    raise exception 'ABORTADO: contas_fixas possui empresa_id nulo';
  end if;
  if (select count(*) from public.contas_fixas
      where id = 3
        and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
        and descricao = 'ALUGUEL APARTAMENTO'
        and valor = 1947.64 and dia_vencimento = 11
        and frequencia = 'Mensal' and ativo is true) <> 1 then
    raise exception 'ABORTADO: órfão legado permitido ID 3 divergiu';
  end if;
  if (select count(*) from public.contas_fixas
      where id = 5
        and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
        and descricao = 'ODONTOCOMPANY'
        and valor = 49.90 and dia_vencimento = 10
        and frequencia = 'Mensal' and ativo is true) <> 1 then
    raise exception 'ABORTADO: ID 5 ainda não foi saneado e validado para Mauro';
  end if;
  if exists (
    select 1 from public.contas_fixas cf
    left join public.empresas e on e.id = cf.empresa_id
    where e.id is null and cf.id <> 3
  ) then
    raise exception 'ABORTADO: existe tenant órfão além do ID 3 permitido';
  end if;
  if exists (
    select 1 from public.contas_fixas cf
    left join lateral (
      select id from public.usuarios where empresa_id = cf.empresa_id limit 1
    ) u on true
    where u.id is null and cf.id <> 3
  ) then
    raise exception 'ABORTADO: existe conta sem usuário de tenant além do ID 3 permitido';
  end if;
end $guard$;

alter table public.contas_fixas enable row level security;

create policy contas_fixas_select_tenant on public.contas_fixas
for select to authenticated
using (exists (select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));

create policy contas_fixas_insert_tenant on public.contas_fixas
for insert to authenticated
with check (exists (select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));

create policy contas_fixas_update_tenant on public.contas_fixas
for update to authenticated
using (exists (select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id))
with check (exists (select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));

create policy contas_fixas_delete_tenant on public.contas_fixas
for delete to authenticated
using (exists (select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));

revoke all on table public.contas_fixas from anon;
grant select, insert, update, delete on table public.contas_fixas to authenticated;

commit;
