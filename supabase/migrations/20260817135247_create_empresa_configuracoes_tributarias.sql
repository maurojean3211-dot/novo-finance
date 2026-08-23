create extension if not exists btree_gist with schema extensions;

create table public.empresa_configuracoes_tributarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  regime_base text not null check (regime_base in ('lucro_real', 'lucro_presumido', 'simples_nacional')),
  ibs_cbs_modalidade text not null check (ibs_cbs_modalidade in ('simples_nacional', 'regime_regular')),
  vigencia_inicio date not null,
  vigencia_fim date,
  observacoes text,
  criado_por uuid not null references auth.users(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint empresa_config_tributaria_vigencia_valida check (vigencia_fim is null or vigencia_fim >= vigencia_inicio),
  constraint empresa_config_tributaria_modalidade_coerente check (regime_base = 'simples_nacional' or ibs_cbs_modalidade = 'regime_regular'),
  constraint empresa_config_tributaria_sem_sobreposicao exclude using gist (
    empresa_id with =,
    daterange(vigencia_inicio, coalesce(vigencia_fim + 1, 'infinity'::date), '[)') with &&
  ),
  unique (empresa_id, vigencia_inicio)
);

comment on table public.empresa_configuracoes_tributarias is
  'Histórico por empresa de enquadramento tributário e modalidade de apuração de IBS/CBS. Não contém alíquotas nem executa cálculos fiscais.';
comment on column public.empresa_configuracoes_tributarias.regime_base is
  'Regime-base jurídico: lucro_real, lucro_presumido ou simples_nacional.';
comment on column public.empresa_configuracoes_tributarias.ibs_cbs_modalidade is
  'Modalidade separada do regime-base. Simples Híbrido na interface = simples_nacional + regime_regular.';

create index empresa_config_tributaria_empresa_vigencia_idx
  on public.empresa_configuracoes_tributarias (empresa_id, vigencia_inicio desc);
create index empresa_config_tributaria_criado_por_idx
  on public.empresa_configuracoes_tributarias (criado_por);

alter table public.empresa_configuracoes_tributarias enable row level security;

create policy "config tributaria: leitura da empresa"
  on public.empresa_configuracoes_tributarias
  for select
  to authenticated
  using (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = empresa_configuracoes_tributarias.empresa_id
  ));

create policy "config tributaria: insercao na empresa"
  on public.empresa_configuracoes_tributarias
  for insert
  to authenticated
  with check (
    criado_por = (select auth.uid())
    and exists (
      select 1 from public.usuarios u
      where u.id = (select auth.uid())
        and u.empresa_id = empresa_configuracoes_tributarias.empresa_id
    )
  );

create policy "config tributaria: atualizacao na empresa"
  on public.empresa_configuracoes_tributarias
  for update
  to authenticated
  using (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = empresa_configuracoes_tributarias.empresa_id
  ))
  with check (
    criado_por = (select auth.uid())
    and exists (
      select 1 from public.usuarios u
      where u.id = (select auth.uid())
        and u.empresa_id = empresa_configuracoes_tributarias.empresa_id
    )
  );

grant select, insert, update on public.empresa_configuracoes_tributarias to authenticated;
