begin;

create or replace function public.validar_escopo_recorrencia_financeira()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_escopo text;
  v_owner uuid;
begin
  if new.recorrencia_id is null then
    return new;
  end if;

  select r.escopo, r.proprietario_id
    into v_escopo, v_owner
    from public.financeiro_recorrencias r
   where r.id = new.recorrencia_id
     and r.empresa_id = new.empresa_id;

  if not found then
    raise exception 'Recorrência financeira inexistente para a empresa.';
  end if;

  if tg_table_name = 'contas_pagar_pessoais' then
    if v_escopo <> 'Pessoal'
       or v_owner is distinct from new.proprietario_id then
      raise exception 'Recorrência pessoal fora do escopo do proprietário.'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'financeiro_titulos' then
    if v_escopo <> 'Empresarial' or v_owner is not null then
      raise exception 'Título empresarial não pode usar recorrência pessoal.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end
$function$;

commit;
