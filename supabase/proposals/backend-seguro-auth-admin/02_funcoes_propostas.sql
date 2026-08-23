-- PROPOSAL — NÃO EXECUTAR.
-- RPC transacional e idempotente para o próprio usuário autenticado.
begin;

create or replace function public.provisionar_conta_v1(
  p_nome_empresa text,
  p_cpf text default null,
  p_whatsapp text default null
)
returns table(usuario_id uuid,empresa_id uuid,resultado text)
language plpgsql security definer set search_path=''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := pg_catalog.lower(nullif(auth.jwt()->>'email',''));
  v_usuario public.usuarios%rowtype;
  v_empresa_id uuid;
  v_empresas uuid[];
begin
  if v_uid is null or v_email is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_uid::text,731991)
  );

  select u.* into v_usuario from public.usuarios u where u.id=v_uid;
  if found then
    if pg_catalog.lower(v_usuario.email) is distinct from v_email then
      raise exception 'Perfil existente possui identidade divergente.' using errcode='23514';
    end if;
    select e.id into v_empresa_id from public.empresas e
    where e.id=v_usuario.empresa_id
      and (e.user_id=v_uid or e.user_id is null);
    if not found then
      raise exception 'Perfil existente possui vínculo empresarial inconsistente.' using errcode='23514';
    end if;
    return query select v_uid,v_empresa_id,'existente'::text;
    return;
  end if;

  select pg_catalog.array_agg(e.id order by e.id) into v_empresas
  from public.empresas e where e.user_id=v_uid;
  if coalesce(pg_catalog.cardinality(v_empresas),0)>1 then
    raise exception 'Mais de uma empresa pertence ao usuário; revisão humana obrigatória.' using errcode='23514';
  end if;

  if pg_catalog.cardinality(v_empresas)=1 then
    v_empresa_id := v_empresas[1];
  else
    if nullif(pg_catalog.btrim(p_nome_empresa),'') is null then
      raise exception 'Nome da empresa é obrigatório.' using errcode='22023';
    end if;
    insert into public.empresas(user_id,name,email,cpf,whatsapp,plano,status)
    values(
      v_uid,pg_catalog.btrim(p_nome_empresa),v_email,
      nullif(pg_catalog.btrim(p_cpf),''),
      nullif(pg_catalog.btrim(p_whatsapp),''),'Básico','Ativo'
    ) returning id into v_empresa_id;
  end if;

  insert into public.usuarios(
    id,nome,email,empresa_id,role,tipo_usuario,nivel,master_admin,permissoes,isento,
    pode_financeiro,pode_emprestimos,pode_compras,pode_vendas,pode_contas_pagar,
    financeiro,emprestimos,vendas,compras,contas_pagar
  ) values(
    v_uid,v_email,v_email,v_empresa_id,'cliente','usuario','usuario',false,null,false,
    false,false,false,false,false,false,false,false,false,false
  );
  return query select v_uid,v_empresa_id,'criado'::text;
end
$function$;

comment on function public.provisionar_conta_v1(text,text,text) is
  'Proposal: provisiona atomicamente empresa e perfil do próprio auth.uid(); não aceita empresa_id nem privilégios.';
commit;

-- MasterAdmin usa Edge Function; nenhum Auth Admin é implementado em SQL.
