create table if not exists public.empresa_notas_fiscais_tributarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero text,
  serie text,
  chave_acesso text,
  data_emissao date,
  tipo_operacao text check (tipo_operacao in ('entrada', 'saida')),
  parte_nome text,
  parte_cnpj text,
  valor_total numeric(18,2),
  frete numeric(18,2),
  icms numeric(18,2),
  ipi numeric(18,2),
  ibs numeric(18,2),
  cbs numeric(18,2),
  observacoes_fiscais text,
  arquivo_nome text not null,
  arquivo_tipo text not null,
  origem_leitura text not null default 'analyze-financial-document-v1',
  confianca_extracao numeric(5,4) check (confianca_extracao between 0 and 1),
  status_tributario text not null default 'pendente_revisao' check (status_tributario in ('regular', 'atencao', 'critico', 'pendente_revisao')),
  regime_aplicado text,
  modalidade_ibs_cbs text,
  vigencia_inicio_usada date,
  extracao_raw jsonb not null default '{}'::jsonb,
  analisada_em timestamptz,
  revisada_em timestamptz,
  revisada_por uuid references auth.users(id),
  integracao_operacional text,
  integrado_em timestamptz,
  criado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create unique index if not exists empresa_notas_fiscais_chave_empresa_uq
  on public.empresa_notas_fiscais_tributarias (empresa_id, chave_acesso)
  where chave_acesso is not null;
create index if not exists empresa_notas_fiscais_empresa_emissao_idx
  on public.empresa_notas_fiscais_tributarias (empresa_id, data_emissao desc, created_at desc);

create table if not exists public.empresa_nota_fiscal_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nota_fiscal_id uuid not null,
  item_ordem integer not null check (item_ordem > 0),
  descricao text,
  ncm text,
  cfop text,
  quantidade numeric(18,6),
  unidade text,
  peso numeric(18,6),
  valor_unitario numeric(18,6),
  valor_total numeric(18,2),
  icms numeric(18,2),
  ipi numeric(18,2),
  ibs numeric(18,2),
  cbs numeric(18,2),
  confianca_extracao numeric(5,4) check (confianca_extracao between 0 and 1),
  created_at timestamptz not null default now(),
  constraint empresa_nota_fiscal_itens_nota_empresa_fk
    foreign key (nota_fiscal_id, empresa_id)
    references public.empresa_notas_fiscais_tributarias(id, empresa_id) on delete cascade,
  unique (nota_fiscal_id, item_ordem)
);

create index if not exists empresa_nota_fiscal_itens_empresa_nota_idx
  on public.empresa_nota_fiscal_itens (empresa_id, nota_fiscal_id, item_ordem);

create table if not exists public.empresa_nota_fiscal_analises (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nota_fiscal_id uuid not null,
  status text not null check (status in ('regular', 'atencao', 'critico', 'pendente_revisao')),
  regime_aplicado text,
  modalidade_ibs_cbs text,
  vigencia_inicio_usada date,
  quantidade_alertas integer not null default 0 check (quantidade_alertas >= 0),
  alertas jsonb not null default '[]'::jsonb check (jsonb_typeof(alertas) = 'array'),
  analisada_em timestamptz not null default now(),
  criado_por uuid not null default auth.uid() references auth.users(id),
  constraint empresa_nota_fiscal_analises_nota_empresa_fk
    foreign key (nota_fiscal_id, empresa_id)
    references public.empresa_notas_fiscais_tributarias(id, empresa_id) on delete cascade
);

create index if not exists empresa_nota_fiscal_analises_empresa_nota_idx
  on public.empresa_nota_fiscal_analises (empresa_id, nota_fiscal_id, analisada_em desc);

alter table public.empresa_notas_fiscais_tributarias enable row level security;
alter table public.empresa_nota_fiscal_itens enable row level security;
alter table public.empresa_nota_fiscal_analises enable row level security;

create policy empresa_notas_fiscais_select on public.empresa_notas_fiscais_tributarias
for select to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_notas_fiscais_tributarias.empresa_id));
create policy empresa_notas_fiscais_insert on public.empresa_notas_fiscais_tributarias
for insert to authenticated with check (criado_por = auth.uid() and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_notas_fiscais_tributarias.empresa_id));
create policy empresa_notas_fiscais_update on public.empresa_notas_fiscais_tributarias
for update to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_notas_fiscais_tributarias.empresa_id))
with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_notas_fiscais_tributarias.empresa_id));
create policy empresa_notas_fiscais_delete on public.empresa_notas_fiscais_tributarias
for delete to authenticated using (integracao_operacional is null and integrado_em is null and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_notas_fiscais_tributarias.empresa_id));

create policy empresa_nota_fiscal_itens_select on public.empresa_nota_fiscal_itens
for select to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_nota_fiscal_itens.empresa_id));
create policy empresa_nota_fiscal_itens_insert on public.empresa_nota_fiscal_itens
for insert to authenticated with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_nota_fiscal_itens.empresa_id));

create policy empresa_nota_fiscal_analises_select on public.empresa_nota_fiscal_analises
for select to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_nota_fiscal_analises.empresa_id));
create policy empresa_nota_fiscal_analises_insert on public.empresa_nota_fiscal_analises
for insert to authenticated with check (criado_por = auth.uid() and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = empresa_nota_fiscal_analises.empresa_id));

revoke all on public.empresa_notas_fiscais_tributarias, public.empresa_nota_fiscal_itens, public.empresa_nota_fiscal_analises from anon;
grant select, insert, update, delete on public.empresa_notas_fiscais_tributarias to authenticated;
grant select, insert on public.empresa_nota_fiscal_itens to authenticated;
grant select, insert on public.empresa_nota_fiscal_analises to authenticated;

comment on column public.empresa_notas_fiscais_tributarias.integracao_operacional is
  'Reservado para integração futura. Enquanto nulo, a nota pode ser excluída pelo usuário autorizado.';
