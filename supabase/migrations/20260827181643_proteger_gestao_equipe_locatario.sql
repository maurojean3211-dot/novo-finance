begin;

create or replace function public.proteger_campos_autorizacao_usuario()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if (select auth.uid()) is not null and (
    new.email is distinct from old.email
    or new.empresa_id is distinct from old.empresa_id
    or new.empresa_id_bloqueada is distinct from old.empresa_id_bloqueada
    or new.role is distinct from old.role
    or new.tipo_usuario is distinct from old.tipo_usuario
    or new.nivel is distinct from old.nivel
    or new.permissoes is distinct from old.permissoes
    or new.master_admin is distinct from old.master_admin
    or new.status is distinct from old.status
    or new.valor_mensal is distinct from old.valor_mensal
  ) then
    raise exception 'Campos de autorização só podem ser alterados pelo fluxo administrativo seguro.'
      using errcode = '42501';
  end if;
  return new;
end
$function$;

drop trigger if exists usuarios_proteger_campos_autorizacao on public.usuarios;
create trigger usuarios_proteger_campos_autorizacao
before update on public.usuarios
for each row execute function public.proteger_campos_autorizacao_usuario();

revoke all on function public.proteger_campos_autorizacao_usuario() from public, anon, authenticated;

commit;
