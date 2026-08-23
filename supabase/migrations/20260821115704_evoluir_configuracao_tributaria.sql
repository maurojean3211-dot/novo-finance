-- Evolução isolada do módulo Sistema > Configuração Tributária.

drop policy if exists "config tributaria: atualizacao na empresa"
  on public.empresa_configuracoes_tributarias;

create policy "config tributaria: encerramento na empresa"
  on public.empresa_configuracoes_tributarias
  for update
  to authenticated
  using (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = empresa_configuracoes_tributarias.empresa_id
  ))
  with check (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = empresa_configuracoes_tributarias.empresa_id
  ));

create or replace function public.proteger_historico_configuracao_tributaria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.empresa_id <> old.empresa_id
    or new.regime_base <> old.regime_base
    or new.ibs_cbs_modalidade <> old.ibs_cbs_modalidade
    or new.vigencia_inicio <> old.vigencia_inicio
    or new.observacoes is distinct from old.observacoes
    or new.criado_por <> old.criado_por
    or new.created_at <> old.created_at
    or old.vigencia_fim is not null
    or new.vigencia_fim is null
  then
    raise exception using errcode = 'P0001', message = 'historico_tributario_imutavel';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_historico_configuracao_tributaria
  on public.empresa_configuracoes_tributarias;
create trigger proteger_historico_configuracao_tributaria
before update on public.empresa_configuracoes_tributarias
for each row execute function public.proteger_historico_configuracao_tributaria();

create or replace function public.registrar_configuracao_tributaria(
  p_empresa_id uuid,
  p_regime_base text,
  p_ibs_cbs_modalidade text,
  p_vigencia_inicio date,
  p_vigencia_fim date default null,
  p_observacoes text default null
)
returns public.empresa_configuracoes_tributarias
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_anterior public.empresa_configuracoes_tributarias%rowtype;
  v_nova public.empresa_configuracoes_tributarias%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'usuario_nao_autenticado';
  end if;

  if p_vigencia_inicio is null or (p_vigencia_fim is not null and p_vigencia_fim < p_vigencia_inicio) then
    raise exception using errcode = '22007', message = 'vigencia_invalida';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_empresa_id::text, 0));

  select config.*
    into v_anterior
    from public.empresa_configuracoes_tributarias config
   where config.empresa_id = p_empresa_id
     and config.vigencia_inicio < p_vigencia_inicio
     and config.vigencia_fim is null
   order by config.vigencia_inicio desc
   limit 1
   for update;

  if found then
    update public.empresa_configuracoes_tributarias
       set vigencia_fim = p_vigencia_inicio - 1
     where id = v_anterior.id;
  end if;

  insert into public.empresa_configuracoes_tributarias (
    empresa_id, regime_base, ibs_cbs_modalidade, vigencia_inicio,
    vigencia_fim, observacoes, criado_por
  ) values (
    p_empresa_id, p_regime_base, p_ibs_cbs_modalidade, p_vigencia_inicio,
    p_vigencia_fim, nullif(pg_catalog.btrim(p_observacoes), ''), (select auth.uid())
  )
  returning * into v_nova;

  return v_nova;
end;
$$;

revoke all on function public.registrar_configuracao_tributaria(uuid, text, text, date, date, text) from public, anon;
grant execute on function public.registrar_configuracao_tributaria(uuid, text, text, date, date, text) to authenticated;

create table public.empresa_regras_tributarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  titulo text not null,
  descricao text not null,
  classificacao text not null default 'ATENCAO' check (classificacao in ('INFO', 'ATENCAO', 'CRITICO')),
  fonte_oficial text not null check (fonte_oficial in ('Receita Federal', 'CGSN', 'CGIBS', 'Legislação oficial')),
  url_fonte text not null check (url_fonte ~ '^https://'),
  data_publicacao date not null,
  inicio_vigencia date not null,
  ultima_verificacao timestamptz not null,
  versao text not null,
  ativa boolean not null default true,
  criado_por uuid not null default auth.uid() references auth.users(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  unique (empresa_id, fonte_oficial, titulo, versao)
);

comment on table public.empresa_regras_tributarias is
  'Regras tributárias oficiais versionadas por empresa. Mudanças geram alertas e nunca alteram automaticamente a configuração.';

create table public.empresa_alertas_tributarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  chave_alerta text not null,
  codigo_regra text not null,
  classificacao text not null check (classificacao in ('INFO', 'ATENCAO', 'CRITICO')),
  titulo text not null,
  descricao text not null,
  fundamento_fonte text not null,
  data_regra date not null,
  resolvido boolean not null default false,
  resolvido_em timestamptz,
  created_at timestamptz not null default now(),
  constraint empresa_alerta_resolucao_coerente check (
    (not resolvido and resolvido_em is null) or (resolvido and resolvido_em is not null)
  ),
  unique (empresa_id, chave_alerta)
);

create index empresa_regras_tributarias_empresa_idx
  on public.empresa_regras_tributarias (empresa_id, inicio_vigencia desc);
create index empresa_alertas_tributarios_empresa_abertos_idx
  on public.empresa_alertas_tributarios (empresa_id, classificacao)
  where not resolvido;

alter table public.empresa_regras_tributarias enable row level security;
alter table public.empresa_alertas_tributarios enable row level security;

create or replace function public.proteger_conteudo_alerta_tributario()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.empresa_id <> old.empresa_id
    or new.chave_alerta <> old.chave_alerta
    or new.codigo_regra <> old.codigo_regra
    or new.classificacao <> old.classificacao
    or new.titulo <> old.titulo
    or new.descricao <> old.descricao
    or new.fundamento_fonte <> old.fundamento_fonte
    or new.data_regra <> old.data_regra
    or new.created_at <> old.created_at
  then
    raise exception using errcode = 'P0001', message = 'conteudo_alerta_tributario_imutavel';
  end if;
  return new;
end;
$$;

create trigger proteger_conteudo_alerta_tributario
before update on public.empresa_alertas_tributarios
for each row execute function public.proteger_conteudo_alerta_tributario();

create policy "regras tributarias: leitura da empresa"
  on public.empresa_regras_tributarias for select to authenticated
  using (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid()) and u.empresa_id = empresa_regras_tributarias.empresa_id
  ));

create policy "regras tributarias: cadastro versionado na empresa"
  on public.empresa_regras_tributarias for insert to authenticated
  with check (
    criado_por = (select auth.uid()) and exists (
      select 1 from public.usuarios u
      where u.id = (select auth.uid()) and u.empresa_id = empresa_regras_tributarias.empresa_id
    )
  );

create policy "alertas tributarios: leitura da empresa"
  on public.empresa_alertas_tributarios for select to authenticated
  using (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid()) and u.empresa_id = empresa_alertas_tributarios.empresa_id
  ));

create policy "alertas tributarios: cadastro na empresa"
  on public.empresa_alertas_tributarios for insert to authenticated
  with check (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid()) and u.empresa_id = empresa_alertas_tributarios.empresa_id
  ));

create policy "alertas tributarios: resolucao na empresa"
  on public.empresa_alertas_tributarios for update to authenticated
  using (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid()) and u.empresa_id = empresa_alertas_tributarios.empresa_id
  ))
  with check (exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid()) and u.empresa_id = empresa_alertas_tributarios.empresa_id
  ));

grant select, insert on public.empresa_regras_tributarias to authenticated;
grant select, insert, update on public.empresa_alertas_tributarios to authenticated;
