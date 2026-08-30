-- Reconcilia os críticos do Financeiro Pessoal com o estado remoto verificado.
-- NÃO depende nem executa 20260824132437_corrigir_criticos_financeiro_pessoal.sql.
-- A transação aborta antes de qualquer alteração enquanto houver ownership não determinístico.

begin;

do $preflight$
declare
  v_rpc record;
begin
  if to_regclass('public.despesas') is null
     or to_regclass('public.contas_fixas') is null
     or to_regclass('public.contas_pagar_pessoais') is null
     or to_regclass('public.contas_pagar_pessoais_pagamento_eventos') is null then
    raise exception 'ABORTADO: estruturas obrigatórias do Financeiro Pessoal estão ausentes';
  end if;

  if to_regprocedure('public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,integer,text,text,text,text,text)') is not null then
    raise exception 'ABORTADO: overload integer da RPC de metadados deve ser removido explicitamente';
  end if;

  for v_rpc in
    select * from (values
      ('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)', 'f1cb96874930ff5ab5706291a78ee83f'),
      ('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)', 'cfe536711d90a5bc6aa20e51a57710de'),
      ('public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text)', 'b481eaaeeab762a09c7b6066c4a6c82d'),
      ('public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)', '58a16f659cc6882849214146571cfec3'),
      ('public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,bigint,text,text,text,text,text)', '5c1d4926c04644346f0b191eaf2f8995')
    ) as expected(signature, definition_md5)
  loop
    if to_regprocedure(v_rpc.signature) is null
       or md5(pg_get_functiondef(to_regprocedure(v_rpc.signature))) <> v_rpc.definition_md5 then
      raise exception 'ABORTADO: RPC robusta ausente ou divergente: %', v_rpc.signature;
    end if;
    if exists (
      select 1 from pg_proc p
      where p.oid = to_regprocedure(v_rpc.signature)
        and (p.prosecdef or not coalesce(p.proconfig, '{}'::text[]) @> array['search_path=""']::text[])
    ) then
      raise exception 'ABORTADO: modo de segurança/search_path divergente: %', v_rpc.signature;
    end if;
  end loop;

  if exists (
    select 1 from public.despesas d
    left join public.empresas e on e.id = d.empresa_id
    where e.id is null
  ) then
    raise exception 'ABORTADO: despesa/receita com empresa inexistente';
  end if;

  if exists (
    select 1 from public.despesas d
    where d.proprietario_id is null
      and (select count(*) from public.usuarios u where u.empresa_id = d.empresa_id) <> 1
  ) then
    raise exception 'ABORTADO: ownership de despesa/receita não é inequivocamente determinável';
  end if;

  -- O remoto possui atualmente uma conta fixa órfã. Esta guarda é intencional:
  -- nenhuma atribuição será feita antes de saneamento manual autorizado.
  if exists (
    select 1 from public.contas_fixas c
    left join public.empresas e on e.id = c.empresa_id
    where e.id is null
  ) then
    raise exception 'ABORTADO: conta fixa com empresa inexistente exige saneamento manual';
  end if;

  if exists (
    select 1 from public.contas_fixas c
    where (select count(*) from public.usuarios u where u.empresa_id = c.empresa_id) <> 1
  ) then
    raise exception 'ABORTADO: ownership de conta fixa não é inequivocamente determinável';
  end if;
end $preflight$;

alter table public.contas_fixas
  add column if not exists proprietario_id uuid references auth.users(id) on update cascade on delete restrict,
  add column if not exists data_base date;

-- A constraint legada considerava todo registro sem evento como sem proprietário.
-- Ela é removida antes do backfill e recriada com ramos explícitos manual/integrado.
alter table public.despesas drop constraint if exists despesas_integracao_all_or_none_check;

update public.despesas d
set proprietario_id = u.id
from public.usuarios u
where d.proprietario_id is null
  and u.empresa_id = d.empresa_id
  and (select count(*) from public.usuarios ux where ux.empresa_id = d.empresa_id) = 1;

update public.contas_fixas c
set proprietario_id = u.id
from public.usuarios u
where c.proprietario_id is null
  and u.empresa_id = c.empresa_id
  and (select count(*) from public.usuarios ux where ux.empresa_id = c.empresa_id) = 1;

update public.contas_fixas
set data_base = make_date(
  2026,
  8,
  least(dia_vencimento, extract(day from date '2026-08-31')::integer)
)
where data_base is null and dia_vencimento between 1 and 31;

do $post_backfill$
begin
  if exists (
    select 1 from public.despesas d
    left join public.usuarios u on u.id = d.proprietario_id and u.empresa_id = d.empresa_id
    where d.proprietario_id is null or u.id is null
  ) then
    raise exception 'ABORTADO: pós-backfill de despesas/receitas deixou ownership inválido';
  end if;
  if exists (
    select 1 from public.contas_fixas c
    left join public.usuarios u on u.id = c.proprietario_id and u.empresa_id = c.empresa_id
    where c.proprietario_id is null or u.id is null or c.data_base is null
  ) then
    raise exception 'ABORTADO: pós-backfill de contas fixas deixou ownership/data_base inválido';
  end if;
end $post_backfill$;

alter table public.despesas alter column proprietario_id set not null;
alter table public.contas_fixas alter column proprietario_id set not null;
alter table public.contas_fixas alter column data_base set not null;

alter table public.despesas add constraint despesas_integracao_all_or_none_check check (
  (
    pagamento_evento_id is null
    and origem_tipo is null
    and estorno_evento_id is null
    and estornada_em is null
    and proprietario_id is not null
    and tipo in ('despesa', 'receita')
  )
  or
  (
    pagamento_evento_id is not null
    and proprietario_id is not null
    and origem_tipo in ('Pagamento', 'Antecipacao', 'Entrada')
    and tipo = 'despesa'
    and valor > 0
    and (
      (estorno_evento_id is null and estornada_em is null and ativo is true)
      or
      (estorno_evento_id is not null and estornada_em is not null and ativo is false)
    )
  )
) not valid;
alter table public.despesas validate constraint despesas_integracao_all_or_none_check;

create or replace function public.validar_ownership_despesa_pessoal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.proprietario_id is null or not exists (
    select 1 from public.usuarios u
    where u.id = new.proprietario_id and u.empresa_id = new.empresa_id
  ) then
    raise exception 'Proprietário da despesa/receita não pertence à empresa';
  end if;
  return new;
end $function$;

drop trigger if exists despesas_ownership_pessoal on public.despesas;
create trigger despesas_ownership_pessoal
before insert or update of empresa_id, proprietario_id on public.despesas
for each row execute function public.validar_ownership_despesa_pessoal();

-- Preserva despesas_evento_pessoal_integridade e acrescenta uma verificação
-- diferida: RPCs podem montar evento + despesa + status na mesma transação,
-- mas um evento isolado não pode ser confirmado.
create or replace function public.validar_evento_financeiro_pessoal_materializado()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.tipo in ('Pagamento', 'Antecipacao', 'Entrada') then
    if not exists (
      select 1 from public.despesas d
      where d.pagamento_evento_id = new.id
        and d.empresa_id = new.empresa_id
        and d.proprietario_id = new.proprietario_id
        and d.origem_tipo = new.tipo
        and d.valor = new.valor_pago
        and d.data_lancamento = new.pago_em
        and d.ativo is true
    ) then
      raise exception 'Evento financeiro sem despesa materializada coerente';
    end if;
    if new.conta_pagar_pessoal_id is not null and not exists (
      select 1 from public.contas_pagar_pessoais c
      where c.id = new.conta_pagar_pessoal_id
        and c.empresa_id = new.empresa_id
        and c.proprietario_id = new.proprietario_id
        and c.status = 'Pago'
    ) then
      raise exception 'Evento financeiro sem obrigação liquidada coerente';
    end if;
  elsif new.tipo = 'Estorno' then
    if not exists (
      select 1
      from public.despesas d
      join public.contas_pagar_pessoais_pagamento_eventos original
        on original.id = d.pagamento_evento_id
      join public.contas_pagar_pessoais c
        on c.id = original.conta_pagar_pessoal_id
      where new.estorno_de_evento_id = original.id
        and d.estorno_evento_id = new.id
        and d.ativo is false
        and d.estornada_em = new.pago_em
        and c.status = 'Pendente'
        and d.empresa_id = new.empresa_id
        and d.proprietario_id = new.proprietario_id
    ) then
      raise exception 'Estorno sem despesa neutralizada e obrigação reaberta';
    end if;
  end if;
  return null;
end $function$;

drop trigger if exists cpp_pag_eventos_materializacao_diferida
  on public.contas_pagar_pessoais_pagamento_eventos;
create constraint trigger cpp_pag_eventos_materializacao_diferida
after insert on public.contas_pagar_pessoais_pagamento_eventos
deferrable initially deferred
for each row execute function public.validar_evento_financeiro_pessoal_materializado();

create or replace function public.proteger_financeiro_conta_pessoal_paga()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if (
    old.status = 'Pago'
    or exists (
      select 1 from public.contas_pagar_pessoais_pagamento_eventos e
      where e.conta_pagar_pessoal_id = old.id
        and e.tipo in ('Pagamento', 'Antecipacao')
        and not exists (
          select 1 from public.contas_pagar_pessoais_pagamento_eventos s
          where s.estorno_de_evento_id = e.id and s.tipo = 'Estorno'
        )
    )
  ) and (
    new.valor is distinct from old.valor
    or new.vencimento is distinct from old.vencimento
    or new.grupo_parcelamento_id is distinct from old.grupo_parcelamento_id
    or new.parcela_numero is distinct from old.parcela_numero
    or new.parcelas_total is distinct from old.parcelas_total
    or new.valor_total_compra is distinct from old.valor_total_compra
    or new.periodicidade is distinct from old.periodicidade
  ) then
    raise exception 'Campos financeiros de obrigação liquidada são imutáveis';
  end if;
  return new;
end $function$;

drop trigger if exists proteger_financeiro_conta_pessoal_paga on public.contas_pagar_pessoais;
create trigger proteger_financeiro_conta_pessoal_paga
before update on public.contas_pagar_pessoais
for each row execute function public.proteger_financeiro_conta_pessoal_paga();

create index if not exists despesas_owner_periodo_idx
  on public.despesas(empresa_id, proprietario_id, data_lancamento);
create index if not exists contas_fixas_owner_base_idx
  on public.contas_fixas(empresa_id, proprietario_id, data_base);

alter table public.despesas enable row level security;
alter table public.contas_fixas enable row level security;

do $policies$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('despesas', 'contas_fixas')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $policies$;

create policy despesas_select_owner on public.despesas for select to authenticated
using (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id));
create policy despesas_insert_owner on public.despesas for insert to authenticated
with check (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id));
create policy despesas_update_owner on public.despesas for update to authenticated
using (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id))
with check (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id));
create policy despesas_delete_owner on public.despesas for delete to authenticated
using (proprietario_id = (select auth.uid()) and pagamento_evento_id is null and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = despesas.empresa_id));

create policy contas_fixas_select_owner on public.contas_fixas for select to authenticated
using (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = contas_fixas.empresa_id));
create policy contas_fixas_insert_owner on public.contas_fixas for insert to authenticated
with check (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = contas_fixas.empresa_id));
create policy contas_fixas_update_owner on public.contas_fixas for update to authenticated
using (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = contas_fixas.empresa_id))
with check (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = contas_fixas.empresa_id));
create policy contas_fixas_delete_owner on public.contas_fixas for delete to authenticated
using (proprietario_id = (select auth.uid()) and exists (
  select 1 from public.usuarios u where u.id = (select auth.uid()) and u.empresa_id = contas_fixas.empresa_id));

revoke all on table public.despesas, public.contas_fixas from public, anon, authenticated;
grant select, insert, update, delete on table public.despesas, public.contas_fixas to authenticated;

-- SECURITY INVOKER requer INSERT da role chamadora. O constraint trigger diferido
-- acima impede que um evento permaneça sem a materialização completa da RPC.
revoke all on table public.contas_pagar_pessoais_pagamento_eventos from public, anon;
revoke update, delete, truncate, references, trigger
  on table public.contas_pagar_pessoais_pagamento_eventos from authenticated;
grant select, insert on table public.contas_pagar_pessoais_pagamento_eventos to authenticated;

do $postflight$
begin
  if exists (
    select 1 from public.despesas d
    left join public.usuarios u on u.id = d.proprietario_id and u.empresa_id = d.empresa_id
    where u.id is null
  ) or exists (
    select 1 from public.contas_fixas c
    left join public.usuarios u on u.id = c.proprietario_id and u.empresa_id = c.empresa_id
    where u.id is null or c.data_base is null
  ) then
    raise exception 'ABORTADO: invariantes finais de ownership/data_base divergiram';
  end if;
  if to_regprocedure('public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,integer,text,text,text,text,text)') is not null
     or to_regprocedure('public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,bigint,text,text,text,text,text)') is null then
    raise exception 'ABORTADO: assinatura final da RPC de metadados divergente';
  end if;
  if has_table_privilege('anon', 'public.contas_fixas', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
     or has_table_privilege('authenticated', 'public.contas_fixas', 'TRUNCATE') then
    raise exception 'ABORTADO: grants finais de contas_fixas divergentes';
  end if;
end $postflight$;

commit;
