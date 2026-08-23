-- MIGRATION LOCAL. NÃO EXECUTADA NO SUPABASE REMOTO.
begin;

create table public.contas_pagar_pessoais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  proprietario_id uuid not null,
  source_legacy_id uuid,
  descricao text not null,
  fornecedor text,
  valor numeric(14, 2) not null,
  vencimento date,
  status text not null default 'Pendente',
  categoria text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint contas_pagar_pessoais_empresa_fkey
    foreign key (empresa_id) references public.empresas(id)
    on update cascade on delete restrict,
  constraint contas_pagar_pessoais_proprietario_fkey
    foreign key (proprietario_id) references auth.users(id)
    on update cascade on delete restrict,
  constraint contas_pagar_pessoais_source_legacy_key unique (source_legacy_id),
  constraint contas_pagar_pessoais_descricao_check
    check (length(btrim(descricao)) > 0),
  constraint contas_pagar_pessoais_valor_check check (valor > 0),
  constraint contas_pagar_pessoais_status_check
    check (status in ('Pendente', 'Pago', 'Cancelada'))
);

comment on table public.contas_pagar_pessoais is
  'Compromissos financeiros exclusivamente pessoais, isolados por proprietário e cliente.';
comment on column public.contas_pagar_pessoais.source_legacy_id is
  'Identificador imutável de rastreabilidade na tabela legada contas_pagar; não cria dependência por FK com o domínio corporativo.';

create index contas_pagar_pessoais_empresa_idx
  on public.contas_pagar_pessoais (empresa_id);
create index contas_pagar_pessoais_proprietario_vencimento_idx
  on public.contas_pagar_pessoais (proprietario_id, empresa_id, vencimento);
create index contas_pagar_pessoais_proprietario_status_idx
  on public.contas_pagar_pessoais (proprietario_id, empresa_id, status);
create unique index contas_pagar_pessoais_obrigacao_logica_key
  on public.contas_pagar_pessoais (
    empresa_id, proprietario_id,
    lower(btrim(coalesce(fornecedor, ''))), lower(btrim(descricao)),
    valor, coalesce(vencimento, date '0001-01-01')
  );

create function public.contas_pagar_pessoais_set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger contas_pagar_pessoais_set_atualizado_em
before update on public.contas_pagar_pessoais
for each row execute function public.contas_pagar_pessoais_set_atualizado_em();

alter table public.contas_pagar_pessoais enable row level security;

create policy contas_pagar_pessoais_select_proprietario
on public.contas_pagar_pessoais
for select to authenticated
using (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = contas_pagar_pessoais.empresa_id
  )
);

create policy contas_pagar_pessoais_insert_proprietario
on public.contas_pagar_pessoais
for insert to authenticated
with check (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = contas_pagar_pessoais.empresa_id
  )
);

create policy contas_pagar_pessoais_update_proprietario
on public.contas_pagar_pessoais
for update to authenticated
using (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = contas_pagar_pessoais.empresa_id
  )
)
with check (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = contas_pagar_pessoais.empresa_id
  )
);

create policy contas_pagar_pessoais_delete_proprietario
on public.contas_pagar_pessoais
for delete to authenticated
using (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = contas_pagar_pessoais.empresa_id
  )
);

revoke all on table public.contas_pagar_pessoais from anon;
grant select, insert, update, delete on table public.contas_pagar_pessoais to authenticated;

commit;
