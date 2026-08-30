begin;

create table public.financeiro_categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  proprietario_id uuid references auth.users(id) on update cascade on delete restrict,
  nome text not null check (length(btrim(nome)) > 0),
  classificacao text not null check (classificacao in (
    'Fixa','Variável essencial','Variável não essencial','Custo fixo','Custo variável'
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
  on public.financeiro_categorias (proprietario_id, empresa_id) where proprietario_id is not null;

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
  foreign key (categoria_id, empresa_id) references public.financeiro_categorias(id, empresa_id) on update cascade on delete restrict,
  unique (empresa_id, proprietario_id, categoria_id, competencia)
);
create index orcamentos_pessoais_owner_competencia_idx
  on public.orcamentos_pessoais_mensais (proprietario_id, empresa_id, competencia);

create table public.financeiro_recorrencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  proprietario_id uuid references auth.users(id) on update cascade on delete restrict,
  escopo text not null check (escopo in ('Pessoal','Empresarial')),
  descricao text not null check (length(btrim(descricao)) > 0),
  contraparte text,
  categoria_id uuid,
  classificacao text not null check (classificacao in (
    'Fixa','Variável essencial','Variável não essencial','Custo fixo','Custo variável'
  )),
  valor_previsto numeric(14,2) not null check (valor_previsto > 0),
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  data_inicio date not null,
  data_fim date,
  frequencia text not null default 'Mensal' check (frequencia in ('Mensal','Semanal','Quinzenal','Anual')),
  ativo boolean not null default true,
  observacoes text,
  forma_pagamento text,
  conta_financeira text,
  centro_custo text,
  gerar_automaticamente boolean not null default true,
  origem text not null default 'Cadastro recorrente',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (categoria_id, empresa_id) references public.financeiro_categorias(id, empresa_id) on update cascade on delete restrict,
  check (data_fim is null or data_fim >= data_inicio),
  check ((escopo = 'Pessoal' and proprietario_id is not null) or (escopo = 'Empresarial' and proprietario_id is null)),
  unique (id, empresa_id)
);
create index financeiro_recorrencias_empresa_ativas_idx
  on public.financeiro_recorrencias (empresa_id, escopo, ativo, data_inicio, data_fim);
create index financeiro_recorrencias_owner_idx
  on public.financeiro_recorrencias (proprietario_id, empresa_id) where proprietario_id is not null;

alter table public.despesas add column if not exists categoria_id uuid;
alter table public.despesas add column if not exists classificacao_financeira text;
alter table public.contas_pagar_pessoais add column if not exists recorrencia_id uuid;
alter table public.contas_pagar_pessoais add column if not exists competencia date;
alter table public.contas_pagar_pessoais add column if not exists classificacao_financeira text;
alter table public.financeiro_titulos add column if not exists recorrencia_id uuid;
alter table public.financeiro_titulos add column if not exists competencia date;
alter table public.financeiro_titulos add column if not exists classificacao_financeira text;

alter table public.despesas
  add constraint despesas_categoria_financeira_fkey foreign key (categoria_id, empresa_id)
  references public.financeiro_categorias(id, empresa_id) on update cascade on delete restrict;
alter table public.contas_pagar_pessoais
  add constraint cpp_recorrencia_fkey foreign key (recorrencia_id, empresa_id)
  references public.financeiro_recorrencias(id, empresa_id) on update cascade on delete restrict;
alter table public.financeiro_titulos
  add constraint financeiro_titulos_recorrencia_fkey foreign key (recorrencia_id, empresa_id)
  references public.financeiro_recorrencias(id, empresa_id) on update cascade on delete restrict;

create unique index cpp_recorrencia_competencia_uidx
  on public.contas_pagar_pessoais (empresa_id, proprietario_id, recorrencia_id, competencia)
  where recorrencia_id is not null;
create unique index financeiro_titulos_recorrencia_competencia_uidx
  on public.financeiro_titulos (empresa_id, recorrencia_id, competencia)
  where recorrencia_id is not null;

create or replace function public.validar_escopo_categoria_financeira()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_owner uuid;
begin
  if new.categoria_id is null then return new; end if;
  select c.proprietario_id into v_owner
    from public.financeiro_categorias c
   where c.id = new.categoria_id and c.empresa_id = new.empresa_id and c.ativo;
  if not found then raise exception 'Categoria financeira inexistente ou inativa.'; end if;
  if tg_table_name in ('despesas','contas_pagar_pessoais','orcamentos_pessoais_mensais')
     and v_owner is distinct from new.proprietario_id then
    raise exception 'Categoria pessoal fora do escopo do proprietário.' using errcode='42501';
  end if;
  if tg_table_name = 'financeiro_recorrencias'
     and ((new.escopo='Pessoal' and v_owner is distinct from new.proprietario_id)
       or (new.escopo='Empresarial' and v_owner is not null)) then
    raise exception 'Categoria fora do escopo da recorrência.' using errcode='42501';
  end if;
  return new;
end $$;

create trigger despesas_validar_categoria before insert or update of categoria_id,empresa_id,proprietario_id on public.despesas
for each row execute function public.validar_escopo_categoria_financeira();
create trigger cpp_validar_categoria before insert or update of categoria_id,empresa_id,proprietario_id on public.contas_pagar_pessoais
for each row execute function public.validar_escopo_categoria_financeira();
create trigger orcamento_pessoal_validar_categoria before insert or update on public.orcamentos_pessoais_mensais
for each row execute function public.validar_escopo_categoria_financeira();
create trigger recorrencia_validar_categoria before insert or update on public.financeiro_recorrencias
for each row execute function public.validar_escopo_categoria_financeira();

create or replace function public.gerar_titulos_recorrentes(
  p_competencia date default date_trunc('month', current_date)::date,
  p_recorrencia_id uuid default null
) returns table (recorrencia_id uuid, titulo_id uuid, escopo text, criado boolean)
language plpgsql security definer set search_path = '' as $$
declare r public.financeiro_recorrencias; v_comp date; v_due date; v_id uuid; v_created boolean;
begin
  v_comp := date_trunc('month', p_competencia)::date;
  for r in
    select * from public.financeiro_recorrencias fr
     where fr.ativo and fr.gerar_automaticamente and fr.frequencia='Mensal'
       and (p_recorrencia_id is null or fr.id=p_recorrencia_id)
       and fr.data_inicio < (v_comp + interval '1 month')::date
       and (fr.data_fim is null or fr.data_fim >= v_comp)
       and ((select auth.uid()) is null or
         (fr.escopo='Pessoal' and fr.proprietario_id=(select auth.uid())) or
         (fr.escopo='Empresarial' and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=fr.empresa_id)))
  loop
    v_due := make_date(extract(year from v_comp)::int, extract(month from v_comp)::int,
      least(r.dia_vencimento, extract(day from (v_comp + interval '1 month - 1 day'))::int));
    v_created := false;
    if r.escopo='Pessoal' then
      insert into public.contas_pagar_pessoais
        (empresa_id,proprietario_id,descricao,fornecedor,valor,vencimento,status,categoria,observacoes,
         recorrencia_id,competencia,classificacao_financeira)
      values (r.empresa_id,r.proprietario_id,r.descricao,r.contraparte,r.valor_previsto,v_due,'Pendente',
        (select nome from public.financeiro_categorias where id=r.categoria_id),r.observacoes,r.id,v_comp,r.classificacao)
      on conflict (empresa_id,proprietario_id,recorrencia_id,competencia) where recorrencia_id is not null do nothing
      returning id into v_id;
    else
      insert into public.financeiro_titulos
        (empresa_id,user_id,tipo,contraparte_nome,origem,origem_id,referencia,descricao,categoria,centro_custo,
         vencimento,valor_original,observacoes,recorrencia_id,competencia,classificacao_financeira)
      values (r.empresa_id,coalesce((select auth.uid()),(select u.id from public.usuarios u where u.empresa_id=r.empresa_id order by u.id limit 1)),
        'Pagar',coalesce(r.contraparte,'Fornecedor não informado'),'Outro',
        'recorrencia:'||r.id::text||':'||to_char(v_comp,'YYYY-MM'),to_char(v_comp,'YYYY-MM'),r.descricao,
        (select nome from public.financeiro_categorias where id=r.categoria_id),r.centro_custo,v_due,r.valor_previsto,
        r.observacoes,r.id,v_comp,r.classificacao)
      on conflict (empresa_id,recorrencia_id,competencia) where recorrencia_id is not null do nothing
      returning id into v_id;
    end if;
    if v_id is null then
      select x.id into v_id from (
        select c.id from public.contas_pagar_pessoais c where r.escopo='Pessoal' and c.recorrencia_id=r.id and c.competencia=v_comp
        union all select t.id from public.financeiro_titulos t where r.escopo='Empresarial' and t.recorrencia_id=r.id and t.competencia=v_comp
      ) x limit 1;
    else v_created := true;
    end if;
    recorrencia_id:=r.id; titulo_id:=v_id; escopo:=r.escopo; criado:=v_created; return next;
    v_id:=null;
  end loop;
end $$;

alter table public.financeiro_categorias enable row level security;
alter table public.orcamentos_pessoais_mensais enable row level security;
alter table public.financeiro_recorrencias enable row level security;

create policy categorias_select_escopo on public.financeiro_categorias for select to authenticated using (
  (proprietario_id=(select auth.uid()) or proprietario_id is null) and exists (
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_categorias.empresa_id));
create policy categorias_insert_escopo on public.financeiro_categorias for insert to authenticated with check (
  (proprietario_id=(select auth.uid()) or proprietario_id is null) and exists (
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_categorias.empresa_id));
create policy categorias_update_escopo on public.financeiro_categorias for update to authenticated using (
  (proprietario_id=(select auth.uid()) or proprietario_id is null) and exists (
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_categorias.empresa_id)) with check (
  (proprietario_id=(select auth.uid()) or proprietario_id is null) and exists (
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_categorias.empresa_id));
create policy categorias_delete_escopo on public.financeiro_categorias for delete to authenticated using (
  (proprietario_id=(select auth.uid()) or proprietario_id is null) and exists (
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_categorias.empresa_id));

create policy orcamentos_pessoais_owner on public.orcamentos_pessoais_mensais for select to authenticated using (
  proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=orcamentos_pessoais_mensais.empresa_id));
create policy orcamentos_pessoais_insert_owner on public.orcamentos_pessoais_mensais for insert to authenticated with check (
  proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=orcamentos_pessoais_mensais.empresa_id));
create policy orcamentos_pessoais_update_owner on public.orcamentos_pessoais_mensais for update to authenticated using (
  proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=orcamentos_pessoais_mensais.empresa_id)) with check (
  proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=orcamentos_pessoais_mensais.empresa_id));
create policy orcamentos_pessoais_delete_owner on public.orcamentos_pessoais_mensais for delete to authenticated using (
  proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=orcamentos_pessoais_mensais.empresa_id));

create policy recorrencias_select_escopo on public.financeiro_recorrencias for select to authenticated using (
  ((escopo='Pessoal' and proprietario_id=(select auth.uid())) or (escopo='Empresarial' and exists(
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_recorrencias.empresa_id))));
create policy recorrencias_insert_escopo on public.financeiro_recorrencias for insert to authenticated with check (
  ((escopo='Pessoal' and proprietario_id=(select auth.uid())) or (escopo='Empresarial' and exists(
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_recorrencias.empresa_id))));
create policy recorrencias_update_escopo on public.financeiro_recorrencias for update to authenticated using (
  ((escopo='Pessoal' and proprietario_id=(select auth.uid())) or (escopo='Empresarial' and exists(
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_recorrencias.empresa_id)))) with check (
  ((escopo='Pessoal' and proprietario_id=(select auth.uid())) or (escopo='Empresarial' and exists(
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_recorrencias.empresa_id))));
create policy recorrencias_delete_escopo on public.financeiro_recorrencias for delete to authenticated using (
  ((escopo='Pessoal' and proprietario_id=(select auth.uid())) or (escopo='Empresarial' and exists(
    select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=financeiro_recorrencias.empresa_id))));

revoke all on public.financeiro_categorias,public.orcamentos_pessoais_mensais,public.financeiro_recorrencias from public,anon,authenticated;
grant select,insert,update,delete on public.financeiro_categorias,public.orcamentos_pessoais_mensais,public.financeiro_recorrencias to authenticated;
revoke execute on function public.gerar_titulos_recorrentes(date,uuid) from public,anon;
grant execute on function public.gerar_titulos_recorrentes(date,uuid) to authenticated;

comment on function public.gerar_titulos_recorrentes(date,uuid) is
  'Gera somente títulos, com idempotência por recorrência/competência; baixas seguem os fluxos financeiros existentes.';
comment on column public.financeiro_titulos.recorrencia_id is 'Rastreabilidade da regra geradora; o título preserva o valor histórico.';
comment on column public.contas_pagar_pessoais.recorrencia_id is 'Rastreabilidade da regra geradora; não representa despesa adicional.';

commit;
