alter table public.fornecedores add column empresa_id uuid;

update public.fornecedores f
set empresa_id = u.empresa_id
from public.usuarios u
where u.id = f.user_id;

alter table public.fornecedores
  alter column empresa_id set not null,
  add constraint fornecedores_empresa_id_fkey foreign key (empresa_id) references public.empresas(id);

create index fornecedores_empresa_id_idx on public.fornecedores(empresa_id);

do $$
declare r record;
begin
  for r in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'fornecedores'
  loop
    execute format('drop policy %I on public.fornecedores', r.policyname);
  end loop;
end $$;

create policy fornecedores_empresa_v1 on public.fornecedores
for all to authenticated
using (
  empresa_id = (select u.empresa_id from public.usuarios u where u.id = (select auth.uid()))
)
with check (
  empresa_id = (select u.empresa_id from public.usuarios u where u.id = (select auth.uid()))
  and user_id in (select u.id from public.usuarios u where u.empresa_id = fornecedores.empresa_id)
);
