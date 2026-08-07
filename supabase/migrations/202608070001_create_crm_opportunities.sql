-- FASE 16.1: revisar no banco remoto os tipos de empresas.id e clientes.id antes de aplicar.
-- empresa_id e cliente_id permanecem text sem FK até essa confirmação; não representam integridade referencial.
create table if not exists public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  cliente_id text null,
  cliente_nome text, empresa_cliente text not null, telefone text, whatsapp text, email text,
  cidade text, estado text, pais text, origem text, segmento text, produto_material text,
  quantidade numeric check (quantidade is null or quantidade >= 0), unidade text,
  valor_estimado numeric not null default 0 check (valor_estimado >= 0),
  probabilidade numeric not null default 0 check (probabilidade between 0 and 100),
  etapa text not null default 'Novo contato' check (etapa in ('Novo contato','Qualificação','Proposta em preparação','Proposta enviada','Negociação','Fechado — ganho','Fechado — perdido')),
  prioridade text not null default 'Média' check (prioridade in ('Alta','Média','Baixa')),
  responsavel text, previsao_fechamento date, observacoes text, motivo_perda text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.crm_oportunidade_historico (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references public.crm_oportunidades(id) on delete cascade,
  empresa_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  tipo text not null, descricao text not null, created_at timestamptz not null default now()
);

create index if not exists crm_oportunidades_empresa_etapa_idx on public.crm_oportunidades (empresa_id, etapa);
create index if not exists crm_oportunidades_empresa_responsavel_idx on public.crm_oportunidades (empresa_id, responsavel);
create index if not exists crm_oportunidades_previsao_idx on public.crm_oportunidades (empresa_id, previsao_fechamento);
create index if not exists crm_oportunidades_empresa_created_idx on public.crm_oportunidades (empresa_id, created_at desc);
create index if not exists crm_historico_oportunidade_idx on public.crm_oportunidade_historico (oportunidade_id, created_at desc);

create or replace function public.crm_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists crm_oportunidades_set_updated_at on public.crm_oportunidades;
create trigger crm_oportunidades_set_updated_at before update on public.crm_oportunidades for each row execute function public.crm_set_updated_at();

alter table public.crm_oportunidades enable row level security;
alter table public.crm_oportunidade_historico enable row level security;

-- Associação multiusuário confirmada no frontend: usuarios.id = auth.users.id e usuarios.empresa_id identifica a empresa.
drop policy if exists "crm_oportunidades_empresa_select" on public.crm_oportunidades;
create policy "crm_oportunidades_empresa_select" on public.crm_oportunidades for select to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = crm_oportunidades.empresa_id));
drop policy if exists "crm_oportunidades_empresa_insert" on public.crm_oportunidades;
create policy "crm_oportunidades_empresa_insert" on public.crm_oportunidades for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = crm_oportunidades.empresa_id));
drop policy if exists "crm_oportunidades_empresa_update" on public.crm_oportunidades;
create policy "crm_oportunidades_empresa_update" on public.crm_oportunidades for update to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = crm_oportunidades.empresa_id)) with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = crm_oportunidades.empresa_id));
drop policy if exists "crm_oportunidades_empresa_delete" on public.crm_oportunidades;
create policy "crm_oportunidades_empresa_delete" on public.crm_oportunidades for delete to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = crm_oportunidades.empresa_id));
drop policy if exists "crm_historico_empresa_select" on public.crm_oportunidade_historico;
create policy "crm_historico_empresa_select" on public.crm_oportunidade_historico for select to authenticated using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = crm_oportunidade_historico.empresa_id));
drop policy if exists "crm_historico_empresa_insert" on public.crm_oportunidade_historico;
create policy "crm_historico_empresa_insert" on public.crm_oportunidade_historico for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id::text = crm_oportunidade_historico.empresa_id)
  and exists (select 1 from public.crm_oportunidades o where o.id = crm_oportunidade_historico.oportunidade_id and o.empresa_id = crm_oportunidade_historico.empresa_id)
);

grant select, insert, update, delete on public.crm_oportunidades to authenticated;
grant select, insert on public.crm_oportunidade_historico to authenticated;
