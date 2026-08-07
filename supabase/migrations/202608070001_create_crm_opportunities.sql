create table if not exists public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(), empresa_id text not null, user_id uuid not null references auth.users(id) on delete restrict, cliente_id text null,
  cliente_nome text, empresa_cliente text not null, telefone text, whatsapp text, email text, cidade text, estado text, pais text, origem text, segmento text, produto_material text, quantidade numeric, unidade text,
  valor_estimado numeric not null default 0, probabilidade numeric not null default 0 check (probabilidade between 0 and 100),
  etapa text not null default 'Novo contato' check (etapa in ('Novo contato','Qualificação','Proposta em preparação','Proposta enviada','Negociação','Fechado — ganho','Fechado — perdido')),
  prioridade text not null default 'Média' check (prioridade in ('Alta','Média','Baixa')), responsavel text, previsao_fechamento date, observacoes text, motivo_perda text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.crm_oportunidade_historico (
  id uuid primary key default gen_random_uuid(), oportunidade_id uuid not null references public.crm_oportunidades(id) on delete cascade, empresa_id text not null, user_id uuid not null references auth.users(id) on delete restrict,
  tipo text not null, descricao text not null, created_at timestamptz not null default now()
);
create index if not exists crm_oportunidades_empresa_etapa_idx on public.crm_oportunidades (empresa_id, etapa);
create index if not exists crm_oportunidades_empresa_responsavel_idx on public.crm_oportunidades (empresa_id, responsavel);
create index if not exists crm_oportunidades_previsao_idx on public.crm_oportunidades (empresa_id, previsao_fechamento);
create index if not exists crm_historico_oportunidade_idx on public.crm_oportunidade_historico (oportunidade_id, created_at desc);
alter table public.crm_oportunidades enable row level security;
alter table public.crm_oportunidade_historico enable row level security;
create policy "crm_oportunidades_empresa_select" on public.crm_oportunidades for select to authenticated using (user_id = auth.uid() and exists (select 1 from public.empresas e where e.id::text = empresa_id and e.user_id = auth.uid()));
create policy "crm_oportunidades_empresa_insert" on public.crm_oportunidades for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.empresas e where e.id::text = empresa_id and e.user_id = auth.uid()));
create policy "crm_oportunidades_empresa_update" on public.crm_oportunidades for update to authenticated using (user_id = auth.uid() and exists (select 1 from public.empresas e where e.id::text = empresa_id and e.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.empresas e where e.id::text = empresa_id and e.user_id = auth.uid()));
create policy "crm_oportunidades_empresa_delete" on public.crm_oportunidades for delete to authenticated using (user_id = auth.uid() and exists (select 1 from public.empresas e where e.id::text = empresa_id and e.user_id = auth.uid()));
create policy "crm_historico_empresa_select" on public.crm_oportunidade_historico for select to authenticated using (user_id = auth.uid() and exists (select 1 from public.empresas e where e.id::text = empresa_id and e.user_id = auth.uid()));
create policy "crm_historico_empresa_insert" on public.crm_oportunidade_historico for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.empresas e where e.id::text = empresa_id and e.user_id = auth.uid()));
