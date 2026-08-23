-- PROPOSAL CONCRETA — NÃO EXECUTAR.
-- Fase 1 integrada: empresas + usuarios, clientes, contas_fixas, recebimentos
-- e emprestimos (condicional).
-- Inventário nominal de empresas incorporado em 2026-08-13. NÃO EXECUTAR.
begin;

do $guard$
declare
  v_count integer;
  v_expected_user_columns text[] := array[
    'id','nome','email','created_at','role','isento','empresa_id','tipo_usuario',
    'pix_chave','cpf','whatsapp','pix','permissoes','nivel','pode_financeiro',
    'pode_emprestimos','pode_compras','pode_vendas','pode_contas_pagar',
    'financeiro','emprestimos','vendas','compras','contas_pagar','master_admin'
  ];
begin
  if (select count(*) from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p')
        and c.relname in ('usuarios','clientes','contas_fixas','emprestimos','parcelas','recebimentos','empresas','vendas')) <> 8 then
    raise exception 'ABORTADO: tabelas críticas ausentes';
  end if;

  if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='usuarios' and c.relrowsecurity and not c.relforcerowsecurity)
  or not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='clientes' and c.relrowsecurity and not c.relforcerowsecurity)
  or not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='empresas' and c.relrowsecurity and not c.relforcerowsecurity)
  or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('contas_fixas','emprestimos','parcelas','recebimentos') and c.relrowsecurity) then
    raise exception 'ABORTADO: estado RLS diverge do inventário remoto';
  end if;

  select count(*) into v_count from pg_catalog.pg_policies where schemaname='public' and
   ((tablename='usuarios' and policyname in ('liberar insert usuarios','liberar leitura usuarios','update usuarios master','usuario_proprio','Usuários veem o próprio perfil','Usuários podem ver seus próprios dados','Usuários atualizam o próprio perfil','Usuários podem atualizar seu próprio PIX'))
   or (tablename='clientes' and policyname in ('liberar tudo clientes','empresa_clientes','select clientes','insert clientes','update clientes','delete clientes','clientes da empresa','Clientes por empresa'))
   or (tablename='emprestimos' and policyname in ('Gerenciar empréstimos da própria empresa','liberar emprestimos','liberar tudo')));
  if v_count <> 19 then raise exception 'ABORTADO: inventário nominal divergiu (%/19)',v_count; end if;
  if (select count(*) from pg_catalog.pg_policies where schemaname='public'
      and tablename in ('usuarios','clientes','emprestimos')) <> 19 then
    raise exception 'ABORTADO: existem policies extras ou ausentes nas tabelas nominais';
  end if;

  if (select count(*) from pg_catalog.pg_policies
      where schemaname='public' and tablename='empresas') <> 29 then
    raise exception 'ABORTADO: inventário nominal de empresas divergiu de 29 policies';
  end if;
  if exists(select expected.policy_name from (values
    ('Atualizar propria empresa'),('Dono cria sua empresa'),('Dono vê sua empresa'),
    ('Liberar select temporario'),('Teste liberar leitura'),('Usuarios podem alterar sua empresa'),
    ('Usuarios veem sua empresa'),('empresa_insert'),('empresa_somente_dono'),
    ('empresas liberado select'),('empresas liberado update'),('empresas por email'),
    ('empresas update email'),('empresas_delete'),('empresas_insert'),('empresas_select'),
    ('empresas_select_auth'),('empresas_update'),('empresas_update_auth'),('liberar empresas'),
    ('liberar leitura empresas'),('liberar update empresas'),('select empresas usuario'),
    ('select_all_auth'),('teste_total_select'),('update empresas usuario'),
    ('usuarios atualizam propria empresa'),('usuarios atualizam propria empresa pix'),
    ('usuarios leem propria empresa')
  ) expected(policy_name)
  where not exists(select 1 from pg_catalog.pg_policies p
    where p.schemaname='public' and p.tablename='empresas' and p.policyname=expected.policy_name)) then
    raise exception 'ABORTADO: policy nominal de empresas ausente';
  end if;

  if exists(select 1 from information_schema.columns
            where table_schema='public' and table_name='usuarios' and column_name='is_admin') then
    raise exception 'ABORTADO: schema divergiu; is_admin passou a existir';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema='public' and table_name='usuarios') <> 25
  or exists(select 1 from unnest(v_expected_user_columns) expected(column_name)
            where not exists(select 1 from information_schema.columns c
              where c.table_schema='public' and c.table_name='usuarios' and c.column_name=expected.column_name)) then
    raise exception 'ABORTADO: as 25 colunas de usuarios divergiram';
  end if;

  if (select count(*) from public.empresas where id in
    ('3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid,'8a85591b-2410-405f-8279-910dbcf61011'::uuid)) <> 2 then
    raise exception 'ABORTADO: empresas oficiais ausentes';
  end if;
  if exists(select 1 from public.usuarios where empresa_id is null)
  or exists(select 1 from public.clientes where empresa_id is null)
  or exists(select 1 from public.contas_fixas where empresa_id is null)
  or exists(select 1 from public.emprestimos where empresa_id is null)
  or exists(select 1 from public.recebimentos where empresa_id is null) then
    raise exception 'ABORTADO: empresa_id NULL em tabela da Fase 1';
  end if;
  if exists(select 1 from public.recebimentos r left join public.vendas v on v.id=r.venda_id
            where r.venda_id is null or v.id is null or v.empresa_id is distinct from r.empresa_id) then
    raise exception 'ABORTADO: recebimento sem venda ou com tenant divergente';
  end if;
end $guard$;

-- Grants: anon perde todo acesso; authenticated recebe apenas DML necessário.
-- service_role permanece intocado e continua fora do modelo RLS comum.
revoke all privileges on table public.usuarios, public.clientes, public.contas_fixas,
  public.emprestimos, public.recebimentos, public.empresas from anon;
revoke all privileges on table public.usuarios, public.clientes, public.contas_fixas,
  public.emprestimos, public.recebimentos, public.empresas from authenticated;
grant select, update on table public.usuarios to authenticated;
grant select, update on table public.empresas to authenticated;
grant select, insert, update, delete on table public.clientes, public.contas_fixas,
  public.emprestimos, public.recebimentos to authenticated;

-- empresas: remove exatamente as 29 policies confirmadas no remoto.
drop policy "Atualizar propria empresa" on public.empresas;
drop policy "Dono cria sua empresa" on public.empresas;
drop policy "Dono vê sua empresa" on public.empresas;
drop policy "Liberar select temporario" on public.empresas;
drop policy "Teste liberar leitura" on public.empresas;
drop policy "Usuarios podem alterar sua empresa" on public.empresas;
drop policy "Usuarios veem sua empresa" on public.empresas;
drop policy "empresa_insert" on public.empresas;
drop policy "empresa_somente_dono" on public.empresas;
drop policy "empresas liberado select" on public.empresas;
drop policy "empresas liberado update" on public.empresas;
drop policy "empresas por email" on public.empresas;
drop policy "empresas update email" on public.empresas;
drop policy "empresas_delete" on public.empresas;
drop policy "empresas_insert" on public.empresas;
drop policy "empresas_select" on public.empresas;
drop policy "empresas_select_auth" on public.empresas;
drop policy "empresas_update" on public.empresas;
drop policy "empresas_update_auth" on public.empresas;
drop policy "liberar empresas" on public.empresas;
drop policy "liberar leitura empresas" on public.empresas;
drop policy "liberar update empresas" on public.empresas;
drop policy "select empresas usuario" on public.empresas;
drop policy "select_all_auth" on public.empresas;
drop policy "teste_total_select" on public.empresas;
drop policy "update empresas usuario" on public.empresas;
drop policy "usuarios atualizam propria empresa" on public.empresas;
drop policy "usuarios atualizam propria empresa pix" on public.empresas;
drop policy "usuarios leem propria empresa" on public.empresas;

create policy empresas_select_tenant_v1 on public.empresas for select to authenticated
  using (exists(select 1 from public.usuarios u
    where u.id=(select auth.uid()) and u.empresa_id=empresas.id));
create policy empresas_update_tenant_v1 on public.empresas for update to authenticated
  using (exists(select 1 from public.usuarios u
    where u.id=(select auth.uid()) and u.empresa_id=empresas.id))
  with check (exists(select 1 from public.usuarios u
    where u.id=(select auth.uid()) and u.empresa_id=empresas.id));

-- Usuário comum pode manter apenas dados funcionais: name, cpf, whatsapp,
-- pix_chave e pix. Tenant, cobrança, status e privilégios exigem backend.
create function public.guard_empresas_campos_v1()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $fn$
begin
  if (select auth.uid()) is not null and (
    new.id is distinct from old.id or new.created_at is distinct from old.created_at
    or new.user_id is distinct from old.user_id or new.is_admin is distinct from old.is_admin
    or new.tipo_sistema is distinct from old.tipo_sistema or new.email is distinct from old.email
    or new.plano is distinct from old.plano or new.status is distinct from old.status
    or new.tipo is distinct from old.tipo or new.isento is distinct from old.isento
    or new.valor_mensal is distinct from old.valor_mensal or new.pagou is distinct from old.pagou
    or new.mes_pagamento is distinct from old.mes_pagamento or new.valor is distinct from old.valor
  ) then
    raise exception 'Alteração administrativa de empresa exige backend autorizado' using errcode='42501';
  end if;
  return new;
end $fn$;
create trigger guard_empresas_campos_v1 before update on public.empresas
  for each row execute function public.guard_empresas_campos_v1();

-- usuarios: o INSERT direto deixa de existir; cadastro usa provisionar_conta_v1.
drop policy "liberar insert usuarios" on public.usuarios;
drop policy "liberar leitura usuarios" on public.usuarios;
drop policy "update usuarios master" on public.usuarios;
drop policy "usuario_proprio" on public.usuarios;
drop policy "Usuários veem o próprio perfil" on public.usuarios;
drop policy "Usuários podem ver seus próprios dados" on public.usuarios;
drop policy "Usuários atualizam o próprio perfil" on public.usuarios;
drop policy "Usuários podem atualizar seu próprio PIX" on public.usuarios;

create policy usuarios_select_proprio_v1 on public.usuarios for select to authenticated
  using ((select auth.uid()) is not null and id=(select auth.uid()));

create policy usuarios_update_proprio_v1 on public.usuarios for update to authenticated
  using ((select auth.uid()) is not null and id=(select auth.uid()))
  with check ((select auth.uid()) is not null and id=(select auth.uid()));

-- RLS não controla colunas. Usuário comum só pode alterar estes campos pessoais:
-- nome, pix, pix_chave, cpf e whatsapp. Email/tenant/privilégios exigem backend seguro.
create function public.guard_usuarios_tenant_privilegios_v1()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $fn$
begin
  if (select auth.uid()) is not null and (
    new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.created_at is distinct from old.created_at
    or new.empresa_id is distinct from old.empresa_id
    or new.role is distinct from old.role
    or new.tipo_usuario is distinct from old.tipo_usuario
    or new.nivel is distinct from old.nivel
    or new.master_admin is distinct from old.master_admin
    or new.permissoes is distinct from old.permissoes
    or new.isento is distinct from old.isento
    or new.pode_financeiro is distinct from old.pode_financeiro
    or new.pode_emprestimos is distinct from old.pode_emprestimos
    or new.pode_compras is distinct from old.pode_compras
    or new.pode_vendas is distinct from old.pode_vendas
    or new.pode_contas_pagar is distinct from old.pode_contas_pagar
    or new.financeiro is distinct from old.financeiro
    or new.emprestimos is distinct from old.emprestimos
    or new.vendas is distinct from old.vendas
    or new.compras is distinct from old.compras
    or new.contas_pagar is distinct from old.contas_pagar
  ) then
    raise exception 'Alteração exige fluxo administrativo autorizado' using errcode='42501';
  end if;
  return new;
end $fn$;
create trigger guard_usuarios_tenant_privilegios_v1 before update on public.usuarios
  for each row execute function public.guard_usuarios_tenant_privilegios_v1();

-- clientes: quatro policies por tenant; WITH CHECK impede troca de empresa.
drop policy "liberar tudo clientes" on public.clientes;
drop policy "empresa_clientes" on public.clientes;
drop policy "select clientes" on public.clientes;
drop policy "insert clientes" on public.clientes;
drop policy "update clientes" on public.clientes;
drop policy "delete clientes" on public.clientes;
drop policy "clientes da empresa" on public.clientes;
drop policy "Clientes por empresa" on public.clientes;
create policy clientes_select_tenant_v1 on public.clientes for select to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=clientes.empresa_id));
create policy clientes_insert_tenant_v1 on public.clientes for insert to authenticated with check
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=clientes.empresa_id));
create policy clientes_update_tenant_v1 on public.clientes for update to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=clientes.empresa_id)) with check
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=clientes.empresa_id));
create policy clientes_delete_tenant_v1 on public.clientes for delete to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=clientes.empresa_id));

-- contas_fixas: policies primeiro, RLS por último, na mesma transação.
create policy contas_fixas_select_tenant_v1 on public.contas_fixas for select to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));
create policy contas_fixas_insert_tenant_v1 on public.contas_fixas for insert to authenticated with check
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));
create policy contas_fixas_update_tenant_v1 on public.contas_fixas for update to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id)) with check
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));
create policy contas_fixas_delete_tenant_v1 on public.contas_fixas for delete to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));
alter table public.contas_fixas enable row level security;

-- emprestimos: Fase 1 condicional; frontend ainda referencia a coluna inexistente historico.
drop policy "Gerenciar empréstimos da própria empresa" on public.emprestimos;
drop policy "liberar emprestimos" on public.emprestimos;
drop policy "liberar tudo" on public.emprestimos;
create policy emprestimos_select_tenant_v1 on public.emprestimos for select to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=emprestimos.empresa_id));
create policy emprestimos_insert_tenant_v1 on public.emprestimos for insert to authenticated with check
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=emprestimos.empresa_id));
create policy emprestimos_update_tenant_v1 on public.emprestimos for update to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=emprestimos.empresa_id)) with check
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=emprestimos.empresa_id));
create policy emprestimos_delete_tenant_v1 on public.emprestimos for delete to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=emprestimos.empresa_id));
alter table public.emprestimos enable row level security;

-- recebimentos: tenant direto e venda obrigatoriamente existente no mesmo tenant.
-- cliente_id não participa porque os vínculos atuais de clientes estão órfãos.
create policy recebimentos_select_tenant_v1 on public.recebimentos for select to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=recebimentos.empresa_id)
   and exists(select 1 from public.vendas v where v.id=recebimentos.venda_id and v.empresa_id=recebimentos.empresa_id));
create policy recebimentos_insert_tenant_v1 on public.recebimentos for insert to authenticated with check
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=recebimentos.empresa_id)
   and exists(select 1 from public.vendas v where v.id=recebimentos.venda_id and v.empresa_id=recebimentos.empresa_id));
create policy recebimentos_update_tenant_v1 on public.recebimentos for update to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=recebimentos.empresa_id)
   and exists(select 1 from public.vendas v where v.id=recebimentos.venda_id and v.empresa_id=recebimentos.empresa_id)) with check
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=recebimentos.empresa_id)
   and exists(select 1 from public.vendas v where v.id=recebimentos.venda_id and v.empresa_id=recebimentos.empresa_id));
create policy recebimentos_delete_tenant_v1 on public.recebimentos for delete to authenticated using
  (exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=recebimentos.empresa_id)
   and exists(select 1 from public.vendas v where v.id=recebimentos.venda_id and v.empresa_id=recebimentos.empresa_id));
alter table public.recebimentos enable row level security;

-- parcelas permanece intencionalmente fora da Fase 1.
commit;
