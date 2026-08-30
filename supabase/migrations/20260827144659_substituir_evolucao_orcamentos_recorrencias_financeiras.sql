begin;

-- Substitui, sem aplicar ou registrar artificialmente, a migration local
-- 20260826165933_evoluir_orcamentos_recorrencias_financeiras.sql.
-- O preflight falha de forma fechada se o remoto não corresponder ao baseline
-- validado em 27/08 ou se houver objetos parciais/divergentes.
do $preflight$
declare
  v_objeto text;
  v_coluna record;
begin
  if exists (
    select 1
      from supabase_migrations.schema_migrations
     where version = '20260826165933'
  ) then
    raise exception 'Preflight: a migration substituída 20260826165933 já consta no histórico remoto.';
  end if;

  if not exists (
    select 1
      from supabase_migrations.schema_migrations
     where version = '20260827142941'
  ) then
    raise exception 'Preflight: a migration-base 20260827142941 não consta no histórico remoto.';
  end if;

  foreach v_objeto in array array[
    'public.empresas',
    'public.usuarios',
    'public.despesas',
    'public.contas_pagar_pessoais',
    'public.financeiro_titulos'
  ] loop
    if to_regclass(v_objeto) is null then
      raise exception 'Preflight: relação obrigatória ausente: %.', v_objeto;
    end if;
  end loop;

  foreach v_objeto in array array[
    'public.financeiro_categorias',
    'public.orcamentos_pessoais_mensais',
    'public.financeiro_recorrencias'
  ] loop
    if to_regclass(v_objeto) is not null then
      raise exception 'Preflight: relação alvo já existe e deve ser reconciliada manualmente: %.', v_objeto;
    end if;
  end loop;

  for v_coluna in
    select *
      from (values
        ('despesas', 'categoria_id'),
        ('despesas', 'classificacao_financeira'),
        ('contas_pagar_pessoais', 'categoria_id'),
        ('contas_pagar_pessoais', 'recorrencia_id'),
        ('contas_pagar_pessoais', 'competencia'),
        ('contas_pagar_pessoais', 'classificacao_financeira'),
        ('financeiro_titulos', 'recorrencia_id'),
        ('financeiro_titulos', 'competencia'),
        ('financeiro_titulos', 'classificacao_financeira')
      ) as x(tabela, coluna)
  loop
    if exists (
      select 1
        from information_schema.columns c
       where c.table_schema = 'public'
         and c.table_name = v_coluna.tabela
         and c.column_name = v_coluna.coluna
    ) then
      raise exception 'Preflight: coluna alvo já existe e deve ser reconciliada manualmente: public.%.%.',
        v_coluna.tabela, v_coluna.coluna;
    end if;
  end loop;

  if to_regprocedure('public.validar_escopo_categoria_financeira()') is not null
     or to_regprocedure('public.validar_escopo_recorrencia_financeira()') is not null
     or to_regprocedure('public.financeiro_planejamento_set_atualizado_em()') is not null
     or to_regprocedure('public.gerar_titulos_recorrentes(date,uuid)') is not null then
    raise exception 'Preflight: uma ou mais funções alvo já existem e devem ser reconciliadas manualmente.';
  end if;

  if exists (
    select 1
      from pg_catalog.pg_trigger
     where not tgisinternal
       and tgname in (
         'despesas_validar_categoria',
         'cpp_validar_categoria',
         'cpp_validar_recorrencia',
         'financeiro_titulos_validar_recorrencia',
         'orcamento_pessoal_validar_categoria',
         'recorrencia_validar_categoria',
         'financeiro_categorias_set_atualizado_em',
         'orcamentos_pessoais_set_atualizado_em',
         'financeiro_recorrencias_set_atualizado_em'
       )
  ) then
    raise exception 'Preflight: um ou mais triggers alvo já existem e devem ser reconciliados manualmente.';
  end if;
end
$preflight$;

create table public.financeiro_categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  proprietario_id uuid references auth.users(id) on update cascade on delete restrict,
  nome text not null check (length(btrim(nome)) > 0),
  classificacao text not null check (classificacao in (
    'Fixa', 'Variável essencial', 'Variável não essencial', 'Custo fixo', 'Custo variável'
  )),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, empresa_id)
);

create unique index financeiro_categorias_pessoal_nome_uidx
  on public.financeiro_categorias (empresa_id, proprietario_id, lower(btrim(nome)))
  where proprietario_id is not null;
create unique index financeiro_categorias_empresa_nome_uidx
  on public.financeiro_categorias (empresa_id, lower(btrim(nome)))
  where proprietario_id is null;
create index financeiro_categorias_owner_idx
  on public.financeiro_categorias (proprietario_id, empresa_id)
  where proprietario_id is not null;

create table public.orcamentos_pessoais_mensais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  proprietario_id uuid not null references auth.users(id) on update cascade on delete restrict,
  categoria_id uuid not null,
  competencia date not null check (competencia = date_trunc('month', competencia)::date),
  valor_previsto numeric(14,2) not null check (valor_previsto >= 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (categoria_id, empresa_id)
    references public.financeiro_categorias(id, empresa_id)
    on update cascade on delete restrict,
  unique (empresa_id, proprietario_id, categoria_id, competencia)
);

create index orcamentos_pessoais_owner_competencia_idx
  on public.orcamentos_pessoais_mensais (proprietario_id, empresa_id, competencia);

create table public.financeiro_recorrencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  proprietario_id uuid references auth.users(id) on update cascade on delete restrict,
  escopo text not null check (escopo in ('Pessoal', 'Empresarial')),
  descricao text not null check (length(btrim(descricao)) > 0),
  contraparte text,
  categoria_id uuid,
  classificacao text not null check (classificacao in (
    'Fixa', 'Variável essencial', 'Variável não essencial', 'Custo fixo', 'Custo variável'
  )),
  valor_previsto numeric(14,2) not null check (valor_previsto > 0),
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  data_inicio date not null,
  data_fim date,
  frequencia text not null default 'Mensal'
    check (frequencia in ('Mensal', 'Semanal', 'Quinzenal', 'Anual')),
  ativo boolean not null default true,
  observacoes text,
  forma_pagamento text,
  conta_financeira text,
  centro_custo text,
  gerar_automaticamente boolean not null default true,
  origem text not null default 'Cadastro recorrente',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (categoria_id, empresa_id)
    references public.financeiro_categorias(id, empresa_id)
    on update cascade on delete restrict,
  check (data_fim is null or data_fim >= data_inicio),
  check (
    (escopo = 'Pessoal' and proprietario_id is not null)
    or (escopo = 'Empresarial' and proprietario_id is null)
  ),
  unique (id, empresa_id),
  unique (id, empresa_id, proprietario_id)
);

create index financeiro_recorrencias_empresa_ativas_idx
  on public.financeiro_recorrencias (empresa_id, escopo, ativo, data_inicio, data_fim);
create index financeiro_recorrencias_owner_idx
  on public.financeiro_recorrencias (proprietario_id, empresa_id)
  where proprietario_id is not null;

alter table public.despesas
  add column categoria_id uuid,
  add column classificacao_financeira text;

alter table public.contas_pagar_pessoais
  add column categoria_id uuid,
  add column recorrencia_id uuid,
  add column competencia date,
  add column classificacao_financeira text;

alter table public.financeiro_titulos
  add column recorrencia_id uuid,
  add column competencia date,
  add column classificacao_financeira text;

alter table public.despesas
  add constraint despesas_categoria_financeira_fkey
  foreign key (categoria_id, empresa_id)
  references public.financeiro_categorias(id, empresa_id)
  on update cascade on delete restrict;

alter table public.contas_pagar_pessoais
  add constraint cpp_categoria_financeira_fkey
  foreign key (categoria_id, empresa_id)
  references public.financeiro_categorias(id, empresa_id)
  on update cascade on delete restrict,
  add constraint cpp_recorrencia_owner_fkey
  foreign key (recorrencia_id, empresa_id, proprietario_id)
  references public.financeiro_recorrencias(id, empresa_id, proprietario_id)
  on update cascade on delete restrict,
  add constraint cpp_recorrencia_competencia_check
  check (
    (recorrencia_id is null and competencia is null)
    or (recorrencia_id is not null and competencia is not null
      and competencia = date_trunc('month', competencia)::date)
  );

alter table public.financeiro_titulos
  add constraint financeiro_titulos_recorrencia_fkey
  foreign key (recorrencia_id, empresa_id)
  references public.financeiro_recorrencias(id, empresa_id)
  on update cascade on delete restrict,
  add constraint financeiro_titulos_recorrencia_competencia_check
  check (
    (recorrencia_id is null and competencia is null)
    or (recorrencia_id is not null and competencia is not null
      and competencia = date_trunc('month', competencia)::date)
  );

create unique index cpp_recorrencia_competencia_uidx
  on public.contas_pagar_pessoais
    (empresa_id, proprietario_id, recorrencia_id, competencia)
  where recorrencia_id is not null;

create unique index financeiro_titulos_recorrencia_competencia_uidx
  on public.financeiro_titulos (empresa_id, recorrencia_id, competencia)
  where recorrencia_id is not null;

create function public.financeiro_planejamento_set_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.atualizado_em := now();
  return new;
end
$function$;

create function public.validar_escopo_categoria_financeira()
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

  if tg_table_name in ('despesas', 'contas_pagar_pessoais', 'orcamentos_pessoais_mensais')
     and v_owner is distinct from new.proprietario_id then
    raise exception 'Categoria pessoal fora do escopo do proprietário.' using errcode = '42501';
  end if;

  if tg_table_name = 'financeiro_recorrencias'
     and (
       (new.escopo = 'Pessoal' and v_owner is distinct from new.proprietario_id)
       or (new.escopo = 'Empresarial' and v_owner is not null)
     ) then
    raise exception 'Categoria fora do escopo da recorrência.' using errcode = '42501';
  end if;

  return new;
end
$function$;

create function public.validar_escopo_recorrencia_financeira()
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

  if tg_table_name = 'contas_pagar_pessoais'
     and (v_escopo <> 'Pessoal' or v_owner is distinct from new.proprietario_id) then
    raise exception 'Recorrência pessoal fora do escopo do proprietário.' using errcode = '42501';
  end if;

  if tg_table_name = 'financeiro_titulos'
     and (v_escopo <> 'Empresarial' or v_owner is not null) then
    raise exception 'Título empresarial não pode usar recorrência pessoal.' using errcode = '42501';
  end if;

  return new;
end
$function$;

create trigger financeiro_categorias_set_atualizado_em
before update on public.financeiro_categorias
for each row execute function public.financeiro_planejamento_set_atualizado_em();

create trigger orcamentos_pessoais_set_atualizado_em
before update on public.orcamentos_pessoais_mensais
for each row execute function public.financeiro_planejamento_set_atualizado_em();

create trigger financeiro_recorrencias_set_atualizado_em
before update on public.financeiro_recorrencias
for each row execute function public.financeiro_planejamento_set_atualizado_em();

create trigger despesas_validar_categoria
before insert or update of categoria_id, empresa_id, proprietario_id
on public.despesas
for each row execute function public.validar_escopo_categoria_financeira();

create trigger cpp_validar_categoria
before insert or update of categoria_id, empresa_id, proprietario_id
on public.contas_pagar_pessoais
for each row execute function public.validar_escopo_categoria_financeira();

create trigger cpp_validar_recorrencia
before insert or update of recorrencia_id, empresa_id, proprietario_id
on public.contas_pagar_pessoais
for each row execute function public.validar_escopo_recorrencia_financeira();

create trigger financeiro_titulos_validar_recorrencia
before insert or update of recorrencia_id, empresa_id
on public.financeiro_titulos
for each row execute function public.validar_escopo_recorrencia_financeira();

create trigger orcamento_pessoal_validar_categoria
before insert or update on public.orcamentos_pessoais_mensais
for each row execute function public.validar_escopo_categoria_financeira();

create trigger recorrencia_validar_categoria
before insert or update on public.financeiro_recorrencias
for each row execute function public.validar_escopo_categoria_financeira();

create function public.gerar_titulos_recorrentes(
  p_competencia date default date_trunc('month', current_date)::date,
  p_recorrencia_id uuid default null
)
returns table (recorrencia_id uuid, titulo_id uuid, escopo text, criado boolean)
language plpgsql
security invoker
set search_path = ''
as $function$
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

alter table public.financeiro_categorias enable row level security;
alter table public.orcamentos_pessoais_mensais enable row level security;
alter table public.financeiro_recorrencias enable row level security;

create policy categorias_select_escopo
on public.financeiro_categorias for select to authenticated
using (
  (select auth.uid()) is not null
  and (proprietario_id = (select auth.uid()) or proprietario_id is null)
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = financeiro_categorias.empresa_id
  )
);

create policy categorias_insert_escopo
on public.financeiro_categorias for insert to authenticated
with check (
  (select auth.uid()) is not null
  and (proprietario_id = (select auth.uid()) or proprietario_id is null)
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = financeiro_categorias.empresa_id
  )
);

create policy categorias_update_escopo
on public.financeiro_categorias for update to authenticated
using (
  (select auth.uid()) is not null
  and (proprietario_id = (select auth.uid()) or proprietario_id is null)
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = financeiro_categorias.empresa_id
  )
)
with check (
  (select auth.uid()) is not null
  and (proprietario_id = (select auth.uid()) or proprietario_id is null)
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = financeiro_categorias.empresa_id
  )
);

create policy categorias_delete_escopo
on public.financeiro_categorias for delete to authenticated
using (
  (select auth.uid()) is not null
  and (proprietario_id = (select auth.uid()) or proprietario_id is null)
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = financeiro_categorias.empresa_id
  )
);

create policy orcamentos_pessoais_select_owner
on public.orcamentos_pessoais_mensais for select to authenticated
using (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = orcamentos_pessoais_mensais.empresa_id
  )
);

create policy orcamentos_pessoais_insert_owner
on public.orcamentos_pessoais_mensais for insert to authenticated
with check (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = orcamentos_pessoais_mensais.empresa_id
  )
);

create policy orcamentos_pessoais_update_owner
on public.orcamentos_pessoais_mensais for update to authenticated
using (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = orcamentos_pessoais_mensais.empresa_id
  )
)
with check (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = orcamentos_pessoais_mensais.empresa_id
  )
);

create policy orcamentos_pessoais_delete_owner
on public.orcamentos_pessoais_mensais for delete to authenticated
using (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = orcamentos_pessoais_mensais.empresa_id
  )
);

create policy recorrencias_select_escopo
on public.financeiro_recorrencias for select to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = financeiro_recorrencias.empresa_id
  )
  and (
    (escopo = 'Pessoal' and proprietario_id = (select auth.uid()))
    or escopo = 'Empresarial'
  )
);

create policy recorrencias_insert_escopo
on public.financeiro_recorrencias for insert to authenticated
with check (
  (select auth.uid()) is not null
  and (
    (
      escopo = 'Pessoal'
      and proprietario_id = (select auth.uid())
      and exists (
        select 1 from public.usuarios u
         where u.id = (select auth.uid())
           and u.empresa_id = financeiro_recorrencias.empresa_id
      )
    )
    or (
      escopo = 'Empresarial'
      and proprietario_id is null
      and exists (
        select 1 from public.usuarios u
         where u.id = (select auth.uid())
           and u.empresa_id = financeiro_recorrencias.empresa_id
      )
    )
  )
);

create policy recorrencias_update_escopo
on public.financeiro_recorrencias for update to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = financeiro_recorrencias.empresa_id
  )
  and (
    (escopo = 'Pessoal' and proprietario_id = (select auth.uid()))
    or escopo = 'Empresarial'
  )
)
with check (
  (select auth.uid()) is not null
  and (
    (
      escopo = 'Pessoal'
      and proprietario_id = (select auth.uid())
      and exists (
        select 1 from public.usuarios u
         where u.id = (select auth.uid())
           and u.empresa_id = financeiro_recorrencias.empresa_id
      )
    )
    or (
      escopo = 'Empresarial'
      and proprietario_id is null
      and exists (
        select 1 from public.usuarios u
         where u.id = (select auth.uid())
           and u.empresa_id = financeiro_recorrencias.empresa_id
      )
    )
  )
);

create policy recorrencias_delete_escopo
on public.financeiro_recorrencias for delete to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.usuarios u
     where u.id = (select auth.uid())
       and u.empresa_id = financeiro_recorrencias.empresa_id
  )
  and (
    (escopo = 'Pessoal' and proprietario_id = (select auth.uid()))
    or escopo = 'Empresarial'
  )
);

revoke all on table
  public.financeiro_categorias,
  public.orcamentos_pessoais_mensais,
  public.financeiro_recorrencias
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.financeiro_categorias,
  public.orcamentos_pessoais_mensais,
  public.financeiro_recorrencias
to authenticated;

revoke all on function public.financeiro_planejamento_set_atualizado_em()
  from public, anon, authenticated;
revoke all on function public.validar_escopo_categoria_financeira()
  from public, anon, authenticated;
revoke all on function public.validar_escopo_recorrencia_financeira()
  from public, anon, authenticated;
revoke all on function public.gerar_titulos_recorrentes(date, uuid)
  from public, anon, authenticated;
grant execute on function public.gerar_titulos_recorrentes(date, uuid)
  to authenticated;

comment on function public.gerar_titulos_recorrentes(date, uuid) is
  'Gera títulos mensais sob RLS: recorrência específica autorizada ou recorrências empresariais da empresa do usuário; idempotente por recorrência e competência.';
comment on column public.financeiro_titulos.recorrencia_id is
  'Rastreabilidade da regra empresarial geradora; o título preserva o valor histórico.';
comment on column public.contas_pagar_pessoais.recorrencia_id is
  'Rastreabilidade da regra pessoal do mesmo proprietário; não representa despesa adicional.';
comment on column public.contas_pagar_pessoais.categoria_id is
  'Categoria financeira pessoal validada por empresa e proprietário.';

commit;
