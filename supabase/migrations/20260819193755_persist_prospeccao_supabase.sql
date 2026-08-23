begin;

create table public.prospeccao_prospectos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid references auth.users(id) on update cascade on delete set null,
  dados jsonb not null default '{}'::jsonb,
  status text not null default 'Novo',
  proximo_retorno_em timestamptz,
  arquivado boolean not null default false,
  convertido_cliente_id uuid,
  convertido_em timestamptz,
  oportunidade_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospeccao_prospectos_id_empresa_key unique (id, empresa_id),
  constraint prospeccao_cliente_tenant_fkey foreign key (convertido_cliente_id, empresa_id)
    references public.clientes(id, empresa_id) on update cascade on delete set null (convertido_cliente_id),
  constraint prospeccao_oportunidade_tenant_fkey foreign key (oportunidade_id, empresa_id)
    references public.crm_oportunidades(id, empresa_id) on update cascade on delete set null (oportunidade_id)
);

create table public.prospeccao_interacoes (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid references auth.users(id) on update cascade on delete set null,
  dados jsonb not null default '{}'::jsonb,
  data_hora timestamptz not null,
  proximo_retorno_em timestamptz,
  created_at timestamptz not null default now(),
  constraint prospeccao_interacao_tenant_fkey foreign key (prospecto_id, empresa_id)
    references public.prospeccao_prospectos(id, empresa_id) on update cascade on delete cascade
);

create index prospeccao_prospectos_empresa_status_idx on public.prospeccao_prospectos(empresa_id, status);
create index prospeccao_prospectos_empresa_retorno_idx on public.prospeccao_prospectos(empresa_id, proximo_retorno_em);
create unique index prospeccao_prospectos_empresa_oportunidade_idx
  on public.prospeccao_prospectos(empresa_id, oportunidade_id) where oportunidade_id is not null;
create index prospeccao_interacoes_prospecto_data_idx
  on public.prospeccao_interacoes(empresa_id, prospecto_id, data_hora desc);

alter table public.prospeccao_prospectos enable row level security;
alter table public.prospeccao_interacoes enable row level security;

create policy prospeccao_prospectos_select_tenant on public.prospeccao_prospectos
for select to authenticated using (exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = prospeccao_prospectos.empresa_id
));
create policy prospeccao_prospectos_insert_tenant on public.prospeccao_prospectos
for insert to authenticated with check (user_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = prospeccao_prospectos.empresa_id
));
create policy prospeccao_prospectos_update_tenant on public.prospeccao_prospectos
for update to authenticated using (exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = prospeccao_prospectos.empresa_id
)) with check (empresa_id = (select u.empresa_id from public.usuarios u where u.id = (select auth.uid())));
create policy prospeccao_prospectos_delete_tenant on public.prospeccao_prospectos
for delete to authenticated using (exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = prospeccao_prospectos.empresa_id
));

create policy prospeccao_interacoes_select_tenant on public.prospeccao_interacoes
for select to authenticated using (exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = prospeccao_interacoes.empresa_id
));
create policy prospeccao_interacoes_insert_tenant on public.prospeccao_interacoes
for insert to authenticated with check (user_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = prospeccao_interacoes.empresa_id
) and exists (
  select 1 from public.prospeccao_prospectos p where p.id = prospeccao_interacoes.prospecto_id and p.empresa_id = prospeccao_interacoes.empresa_id
));

create or replace function public.converter_prospecto_comercial(p_prospecto_id uuid)
returns table (cliente_id uuid, oportunidade_id uuid, cliente_reutilizado boolean, oportunidade_reutilizada boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prospect public.prospeccao_prospectos%rowtype;
  v_cliente_id uuid;
  v_oportunidade_id uuid;
  v_cliente_reutilizado boolean := false;
  v_oportunidade_reutilizada boolean := false;
  v_documento text;
  v_email text;
  v_telefone text;
begin
  select p.* into v_prospect
  from public.prospeccao_prospectos p
  where p.id = p_prospecto_id
  for update;

  if not found then raise exception 'Prospecto não encontrado na empresa ativa'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_prospect.empresa_id::text, 0));
  v_documento := pg_catalog.regexp_replace(coalesce(v_prospect.dados->>'cnpj', ''), '\D', '', 'g');
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(v_prospect.dados->>'email', '')));
  v_telefone := pg_catalog.regexp_replace(coalesce(nullif(v_prospect.dados->>'telefone', ''), v_prospect.dados->>'whatsapp', ''), '\D', '', 'g');

  select c.id into v_cliente_id
  from public.clientes c
  where c.empresa_id = v_prospect.empresa_id
    and ((v_documento <> '' and pg_catalog.regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') = v_documento)
      or (v_email <> '' and pg_catalog.lower(pg_catalog.btrim(coalesce(c.email, ''))) = v_email)
      or (v_telefone <> '' and (pg_catalog.regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g') = v_telefone
        or pg_catalog.regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g') = v_telefone)))
  order by c.created_at nulls last, c.id limit 1;

  if v_cliente_id is null then
    insert into public.clientes (empresa_id, user_id, nome, email, telefone, whatsapp, cpf, ativo)
    values (v_prospect.empresa_id, (select auth.uid()),
      coalesce(nullif(v_prospect.dados->>'nomeFantasia', ''), nullif(v_prospect.dados->>'razaoSocial', ''), 'Prospecto convertido'),
      nullif(v_prospect.dados->>'email', ''), nullif(v_prospect.dados->>'telefone', ''),
      nullif(v_prospect.dados->>'whatsapp', ''), nullif(v_prospect.dados->>'cnpj', ''), true)
    returning id into v_cliente_id;
  else
    v_cliente_reutilizado := true;
  end if;

  v_oportunidade_id := v_prospect.oportunidade_id;
  if v_oportunidade_id is null then
    insert into public.crm_oportunidades (
      empresa_id, user_id, cliente_id, cliente_nome, empresa_cliente, telefone, whatsapp, email,
      cidade, estado, pais, origem, segmento, produto_material, etapa, prioridade, responsavel, observacoes
    ) values (
      v_prospect.empresa_id, (select auth.uid()), v_cliente_id, nullif(v_prospect.dados->>'contatoNome', ''),
      coalesce(nullif(v_prospect.dados->>'nomeFantasia', ''), nullif(v_prospect.dados->>'razaoSocial', ''), 'Prospecto convertido'),
      nullif(v_prospect.dados->>'telefone', ''), nullif(v_prospect.dados->>'whatsapp', ''), nullif(v_prospect.dados->>'email', ''),
      nullif(v_prospect.dados->>'cidade', ''), nullif(v_prospect.dados->>'estado', ''), nullif(v_prospect.dados->>'pais', ''),
      nullif(v_prospect.dados->>'origem', ''), nullif(v_prospect.dados->>'segmento', ''), nullif(v_prospect.dados->>'necessidade', ''),
      'Qualificação', coalesce(nullif(v_prospect.dados->>'retornoPrioridade', ''), 'Média'),
      nullif(v_prospect.dados->>'responsavel', ''), nullif(v_prospect.dados->>'observacoes', ''))
    returning id into v_oportunidade_id;
  else
    v_oportunidade_reutilizada := true;
    update public.crm_oportunidades o set cliente_id = v_cliente_id
    where o.id = v_oportunidade_id and o.empresa_id = v_prospect.empresa_id
      and (o.cliente_id is null or o.cliente_id = v_cliente_id);
    if not found then raise exception 'Oportunidade vinculada a outro cliente ou fora da empresa ativa'; end if;
  end if;

  update public.prospeccao_prospectos p
  set convertido_cliente_id = v_cliente_id, convertido_em = coalesce(p.convertido_em, pg_catalog.now()),
      oportunidade_id = v_oportunidade_id, status = 'Convertido em cliente', arquivado = false, updated_at = pg_catalog.now()
  where p.id = v_prospect.id and p.empresa_id = v_prospect.empresa_id;

  return query select v_cliente_id, v_oportunidade_id, v_cliente_reutilizado, v_oportunidade_reutilizada;
end;
$$;

revoke all on function public.converter_prospecto_comercial(uuid) from public;
grant execute on function public.converter_prospecto_comercial(uuid) to authenticated;

grant select, insert, update, delete on public.prospeccao_prospectos to authenticated;
grant select, insert on public.prospeccao_interacoes to authenticated;

commit;
