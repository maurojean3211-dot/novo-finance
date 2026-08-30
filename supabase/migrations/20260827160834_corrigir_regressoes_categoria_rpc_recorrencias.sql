begin;

create or replace function public.validar_escopo_categoria_financeira()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_owner uuid;
begin
  if new.categoria_id is null then
    return new;
  end if;

  select c.proprietario_id
    into v_owner
    from public.financeiro_categorias c
   where c.id = new.categoria_id
     and c.empresa_id = new.empresa_id
     and c.ativo;

  if not found then
    raise exception 'Categoria financeira inexistente ou inativa.';
  end if;

  if tg_table_name in (
    'despesas',
    'contas_pagar_pessoais',
    'orcamentos_pessoais_mensais'
  ) then
    if v_owner is distinct from new.proprietario_id then
      raise exception 'Categoria pessoal fora do escopo do proprietário.'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'financeiro_recorrencias' then
    if (new.escopo = 'Pessoal' and v_owner is distinct from new.proprietario_id)
       or (new.escopo = 'Empresarial' and v_owner is not null) then
      raise exception 'Categoria fora do escopo da recorrência.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end
$function$;

create or replace function public.gerar_titulos_recorrentes(
  p_competencia date default date_trunc('month', current_date)::date,
  p_recorrencia_id uuid default null
)
returns table (recorrencia_id uuid, titulo_id uuid, escopo text, criado boolean)
language plpgsql
security invoker
set search_path = ''
as $function$
#variable_conflict use_column
declare
  r public.financeiro_recorrencias;
  v_comp date;
  v_due date;
  v_id uuid;
  v_created boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  v_comp := date_trunc('month', p_competencia)::date;

  for r in
    select *
      from public.financeiro_recorrencias fr
     where fr.ativo
       and fr.gerar_automaticamente
       and fr.frequencia = 'Mensal'
       and (
         (p_recorrencia_id is not null and fr.id = p_recorrencia_id)
         or (p_recorrencia_id is null and fr.escopo = 'Empresarial')
       )
       and fr.data_inicio < (v_comp + interval '1 month')::date
       and (fr.data_fim is null or fr.data_fim >= v_comp)
       and (
         (fr.escopo = 'Pessoal' and fr.proprietario_id = (select auth.uid()))
         or (
           fr.escopo = 'Empresarial'
           and exists (
             select 1
               from public.usuarios u
              where u.id = (select auth.uid())
                and u.empresa_id = fr.empresa_id
           )
         )
       )
  loop
    v_id := null;
    v_created := false;
    v_due := make_date(
      extract(year from v_comp)::integer,
      extract(month from v_comp)::integer,
      least(
        r.dia_vencimento,
        extract(day from (v_comp + interval '1 month - 1 day'))::integer
      )
    );

    if r.escopo = 'Pessoal' then
      insert into public.contas_pagar_pessoais (
        empresa_id, proprietario_id, descricao, fornecedor, valor, vencimento,
        status, categoria, categoria_id, observacoes, recorrencia_id, competencia,
        classificacao_financeira
      )
      values (
        r.empresa_id, r.proprietario_id, r.descricao, r.contraparte,
        r.valor_previsto, v_due, 'Pendente',
        (select c.nome from public.financeiro_categorias c where c.id = r.categoria_id),
        r.categoria_id, r.observacoes, r.id, v_comp, r.classificacao
      )
      on conflict (empresa_id, proprietario_id, recorrencia_id, competencia)
        where recorrencia_id is not null
      do nothing
      returning id into v_id;
    else
      insert into public.financeiro_titulos (
        empresa_id, user_id, tipo, contraparte_nome, origem, origem_id,
        referencia, descricao, categoria, centro_custo, vencimento,
        valor_original, observacoes, recorrencia_id, competencia,
        classificacao_financeira
      )
      values (
        r.empresa_id, (select auth.uid()), 'Pagar',
        coalesce(r.contraparte, 'Fornecedor não informado'), 'Outro',
        'recorrencia:' || r.id::text || ':' || to_char(v_comp, 'YYYY-MM'),
        to_char(v_comp, 'YYYY-MM'), r.descricao,
        (select c.nome from public.financeiro_categorias c where c.id = r.categoria_id),
        r.centro_custo, v_due, r.valor_previsto, r.observacoes,
        r.id, v_comp, r.classificacao
      )
      on conflict (empresa_id, recorrencia_id, competencia)
        where recorrencia_id is not null
      do nothing
      returning id into v_id;
    end if;

    if v_id is null then
      if r.escopo = 'Pessoal' then
        select c.id
          into v_id
          from public.contas_pagar_pessoais c
         where c.empresa_id = r.empresa_id
           and c.proprietario_id = r.proprietario_id
           and c.recorrencia_id = r.id
           and c.competencia = v_comp;
      else
        select t.id
          into v_id
          from public.financeiro_titulos t
         where t.empresa_id = r.empresa_id
           and t.recorrencia_id = r.id
           and t.competencia = v_comp;
      end if;
    else
      v_created := true;
    end if;

    recorrencia_id := r.id;
    titulo_id := v_id;
    escopo := r.escopo;
    criado := v_created;
    return next;
  end loop;
end
$function$;

commit;
