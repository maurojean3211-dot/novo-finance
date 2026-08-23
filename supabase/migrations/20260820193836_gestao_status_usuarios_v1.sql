alter table public.usuarios
  add column status text not null default 'PENDENTE',
  add column empresa_solicitada text,
  add column empresa_id_bloqueada uuid references public.empresas(id);

update public.usuarios
set status = case when empresa_id is not null then 'ATIVO' else 'PENDENTE' end;

alter table public.usuarios
  add constraint usuarios_status_v1_check
  check (status in ('PENDENTE','ATIVO','REPROVADO','BLOQUEADO'));

create or replace function public.criar_usuario_automatico()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.usuarios(id,email,nome,tipo_usuario,cpf,whatsapp,empresa_solicitada,status)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome',new.email),
    'cliente',
    nullif(new.raw_user_meta_data->>'cpf',''),
    nullif(new.raw_user_meta_data->>'whatsapp',''),
    nullif(new.raw_user_meta_data->>'empresa_nome',''),
    'PENDENTE'
  );
  return new;
end $$;

create or replace function public.criar_usuario()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.usuarios(id,email,nome,role,isento,empresa_solicitada,status)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'nome',new.email),'cliente',false,nullif(new.raw_user_meta_data->>'empresa_nome',''),'PENDENTE');
  return new;
end $$;

revoke execute on function public.criar_usuario() from public,anon,authenticated;
revoke execute on function public.criar_usuario_automatico() from public,anon,authenticated;
