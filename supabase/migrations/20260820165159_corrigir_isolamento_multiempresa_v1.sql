do $$
declare r record;
begin
  for r in select schemaname,tablename,policyname from pg_policies
    where schemaname='public' and tablename in ('vendas','compras','lancamentos','clientes','empresas','usuarios')
  loop
    execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

alter table public.vendas enable row level security;
alter table public.compras enable row level security;
alter table public.lancamentos enable row level security;
alter table public.clientes enable row level security;
alter table public.empresas enable row level security;
alter table public.usuarios enable row level security;

revoke all on public.vendas,public.compras,public.lancamentos,public.clientes,public.empresas,public.usuarios from anon;
revoke all on public.usuarios from authenticated;
grant select,insert,update,delete on public.vendas,public.compras,public.lancamentos,public.clientes,public.empresas to authenticated;
grant select on public.usuarios to authenticated;
grant update(nome,pix,pix_chave,cpf,whatsapp) on public.usuarios to authenticated;

create policy vendas_empresa_v1 on public.vendas for all to authenticated
using (empresa_id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())))
with check (empresa_id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())));

create policy compras_empresa_v1 on public.compras for all to authenticated
using (empresa_id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())))
with check (empresa_id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())));

create policy lancamentos_empresa_v1 on public.lancamentos for all to authenticated
using (empresa_id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())))
with check (empresa_id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())));

create policy clientes_empresa_v1 on public.clientes for all to authenticated
using (empresa_id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())))
with check (empresa_id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())));

create policy empresas_select_v1 on public.empresas for select to authenticated
using (id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())));
create policy empresas_insert_v1 on public.empresas for insert to authenticated
with check (user_id=(select auth.uid()));
create policy empresas_update_v1 on public.empresas for update to authenticated
using (id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())))
with check (id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())));
create policy empresas_delete_v1 on public.empresas for delete to authenticated
using (id=(select u.empresa_id from public.usuarios u where u.id=(select auth.uid())) and user_id=(select auth.uid()));

create policy usuarios_select_proprio_v1 on public.usuarios for select to authenticated
using (id=(select auth.uid()));
create policy usuarios_update_proprio_v1 on public.usuarios for update to authenticated
using (id=(select auth.uid())) with check (id=(select auth.uid()));

create or replace function public.criar_usuario()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.usuarios(id,email,nome,role,isento)
  values(new.id,new.email,new.email,'cliente',false);
  return new;
end $$;

create or replace function public.criar_usuario_automatico()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.usuarios(id,email,nome,tipo_usuario)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'nome',new.email),'cliente');
  return new;
end $$;

create or replace function public.set_empresa_user()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.user_id:=(select auth.uid());
  return new;
end $$;

revoke execute on function public.criar_usuario() from public,anon,authenticated;
revoke execute on function public.criar_usuario_automatico() from public,anon,authenticated;
revoke execute on function public.set_empresa_user() from public,anon,authenticated;

revoke execute on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text) from public,anon,authenticated;
revoke execute on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text) from public,anon,authenticated;
revoke execute on function public.receber_item_pedido(uuid,uuid,numeric) from public,anon,authenticated;
revoke execute on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text,uuid) from public,anon;
revoke execute on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text,uuid) from public,anon;
revoke execute on function public.confirmar_recebimento(uuid,uuid,uuid) from public,anon;
revoke execute on function public.receber_item_pedido(uuid,uuid,numeric,uuid) from public,anon;
revoke execute on function public.registrar_titulo_financeiro(uuid,text,text,text,text,text,text,date,numeric,text,text,text,text) from public,anon;
revoke execute on function public.editar_titulo_financeiro(uuid,uuid,text,text,text,text,text,date,text) from public,anon;
revoke execute on function public.estornar_baixa_financeira(uuid,uuid,date,text) from public,anon;
