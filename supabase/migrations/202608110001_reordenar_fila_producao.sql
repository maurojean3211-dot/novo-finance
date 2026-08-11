-- Fase 27: programação fina e sequenciamento manual por recurso. Não aplicar automaticamente.

create or replace function public.reordenar_fila_producao(
  p_empresa_id text,
  p_recurso_id uuid,
  p_alocacoes uuid[]
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total integer;
  v_distintos integer;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.empresa_id::text = p_empresa_id
  ) then
    raise exception 'Empresa não autorizada.';
  end if;

  if not exists (
    select 1 from public.recursos_producao r
    where r.id = p_recurso_id and r.empresa_id = p_empresa_id
  ) then
    raise exception 'Recurso produtivo não encontrado para a empresa.';
  end if;

  select count(*), count(distinct item)
    into v_total, v_distintos
  from unnest(coalesce(p_alocacoes, '{}'::uuid[])) item;

  if v_total = 0 or v_total <> v_distintos then
    raise exception 'A fila deve conter alocações únicas.';
  end if;

  if v_total <> (
    select count(*) from public.ordem_producao_recursos opr
    where opr.empresa_id = p_empresa_id and opr.recurso_id = p_recurso_id
  ) or exists (
    select 1 from unnest(p_alocacoes) item
    where not exists (
      select 1 from public.ordem_producao_recursos opr
      where opr.id = item and opr.empresa_id = p_empresa_id and opr.recurso_id = p_recurso_id
    )
  ) then
    raise exception 'A fila mudou desde a última leitura. Atualize a página e tente novamente.';
  end if;

  update public.ordem_producao_recursos opr
  set sequencia = ordered.position,
      user_id = auth.uid(),
      updated_at = now()
  from unnest(p_alocacoes) with ordinality ordered(id, position)
  where opr.id = ordered.id
    and opr.empresa_id = p_empresa_id
    and opr.recurso_id = p_recurso_id;

  insert into public.ordem_producao_historico (ordem_id, empresa_id, user_id, tipo, descricao, dados)
  select opr.ordem_id, p_empresa_id, auth.uid(), 'Programação',
         'Posição da OP atualizada manualmente na fila do recurso.',
         jsonb_build_object('recurso_id', p_recurso_id, 'sequencia', opr.sequencia)
  from public.ordem_producao_recursos opr
  where opr.empresa_id = p_empresa_id
    and opr.recurso_id = p_recurso_id;
end;
$$;

revoke all on function public.reordenar_fila_producao(text,uuid,uuid[]) from public;
grant execute on function public.reordenar_fila_producao(text,uuid,uuid[]) to authenticated;

comment on function public.reordenar_fila_producao(text,uuid,uuid[]) is
  'Reordena atomicamente a fila completa de um recurso após confirmação humana; não altera prazos comerciais.';
