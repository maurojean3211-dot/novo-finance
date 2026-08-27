begin;

-- Remove as policies legadas permissivas de contas_pagar.
drop policy if exists "ler contas pagar" on public.contas_pagar;
drop policy if exists "inserir contas pagar" on public.contas_pagar;
drop policy if exists "update contas pagar" on public.contas_pagar;
drop policy if exists "excluir contas pagar" on public.contas_pagar;

-- Cada operação fica restrita à empresa vinculada ao usuário autenticado.
create policy contas_pagar_select_empresa_v2
on public.contas_pagar
for select
to authenticated
using (
  empresa_id = (
    select u.empresa_id
    from public.usuarios u
    where u.id = (select auth.uid())
  )
);

create policy contas_pagar_insert_empresa_v2
on public.contas_pagar
for insert
to authenticated
with check (
  empresa_id = (
    select u.empresa_id
    from public.usuarios u
    where u.id = (select auth.uid())
  )
);

create policy contas_pagar_update_empresa_v2
on public.contas_pagar
for update
to authenticated
using (
  empresa_id = (
    select u.empresa_id
    from public.usuarios u
    where u.id = (select auth.uid())
  )
)
with check (
  empresa_id = (
    select u.empresa_id
    from public.usuarios u
    where u.id = (select auth.uid())
  )
);

create policy contas_pagar_delete_empresa_v2
on public.contas_pagar
for delete
to authenticated
using (
  empresa_id = (
    select u.empresa_id
    from public.usuarios u
    where u.id = (select auth.uid())
  )
);

-- A policy produtos_empresa já restringe todas as operações pela empresa.
-- Remover esta policy permissiva elimina o bypass de INSERT entre empresas.
drop policy if exists insert_produtos_auth on public.produtos;

commit;
