-- MIGRATION CONTROLADA LOCAL. NÃO EXECUTAR SEM AUTORIZAÇÃO REMOTA EXPLÍCITA.
begin;

do $guards$
declare
  v_policies_contas name[];
  v_policies_despesas name[];
begin
  if to_regclass('public.contas_pagar_pessoais') is null then
    raise exception 'ABORTADO: public.contas_pagar_pessoais não existe';
  end if;
  if (select count(*) from public.contas_pagar_pessoais) <> 43
     or (select count(*) from public.contas_pagar_pessoais where status = 'Pago') <> 21
     or (select count(*) from public.contas_pagar_pessoais where status = 'Pendente') <> 22
     or (select count(*) from public.contas_pagar_pessoais where status = 'Cancelada') <> 0
     or (select coalesce(sum(valor), 0) from public.contas_pagar_pessoais) <> 41574.73 then
    raise exception 'ABORTADO: estado agregado das 43 obrigações divergiu';
  end if;
  if (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id is not null) <> 24
     or (select count(distinct grupo_parcelamento_id) from public.contas_pagar_pessoais where grupo_parcelamento_id is not null) <> 1
     or (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id = '0fcb172c-524c-4499-b93a-5d8d68203165'::uuid) <> 24
     or (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id = '0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and status = 'Pago') <> 5
     or (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id = '0fcb172c-524c-4499-b93a-5d8d68203165'::uuid and status = 'Pendente') <> 19
     or (select sum(valor) from public.contas_pagar_pessoais where grupo_parcelamento_id = '0fcb172c-524c-4499-b93a-5d8d68203165'::uuid) <> 31392.00 then
    raise exception 'ABORTADO: grupo real de 24 parcelas divergiu';
  end if;
  if to_regclass('public.contas_pagar_pessoais_pagamento_eventos') is not null
     or to_regprocedure('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)') is not null
     or to_regprocedure('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)') is not null then
    raise exception 'ABORTADO: estrutura de eventos/RPC já existe total ou parcialmente';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contas_pagar_pessoais'
      and column_name in ('valor_pago','data_pagamento','desconto','pagamento_id','entrada_id')
  ) then
    raise exception 'ABORTADO: coluna de pagamento/entrada conflitante já existe';
  end if;
  select array_agg(policyname order by policyname) into v_policies_contas
  from pg_policies where schemaname = 'public' and tablename = 'contas_pagar_pessoais';
  if v_policies_contas is distinct from array[
    'contas_pagar_pessoais_delete_proprietario','contas_pagar_pessoais_insert_proprietario',
    'contas_pagar_pessoais_select_proprietario','contas_pagar_pessoais_update_proprietario'
  ]::name[] then
    raise exception 'ABORTADO: policies de contas_pagar_pessoais divergiram: %', v_policies_contas;
  end if;
  select array_agg(policyname order by policyname) into v_policies_despesas
  from pg_policies where schemaname = 'public' and tablename = 'despesas';
  if v_policies_despesas is distinct from array[
    'despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant'
  ]::name[] then
    raise exception 'ABORTADO: hardening de despesas divergiu: %', v_policies_despesas;
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename in ('contas_pagar_pessoais','despesas')
      and (qual = 'true' or with_check = 'true')
  ) then
    raise exception 'ABORTADO: policy ampla foi encontrada';
  end if;
end $guards$;

create unique index contas_pagar_pessoais_scope_key
  on public.contas_pagar_pessoais (id, empresa_id, proprietario_id);

create table public.contas_pagar_pessoais_pagamento_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  proprietario_id uuid not null,
  conta_pagar_pessoal_id uuid,
  entrada_id uuid,
  tipo text not null,
  valor_nominal numeric(14,2) not null,
  valor_pago numeric(14,2) not null,
  desconto_obtido numeric(14,2) not null default 0,
  pago_em date not null,
  observacoes text,
  idempotency_key uuid not null,
  estorno_de_evento_id uuid,
  autor_id uuid not null,
  criado_em timestamptz not null default now(),

  constraint cpp_pag_eventos_empresa_fkey
    foreign key (empresa_id) references public.empresas(id) on update cascade on delete restrict,
  constraint cpp_pag_eventos_proprietario_fkey
    foreign key (proprietario_id) references auth.users(id) on update cascade on delete restrict,
  constraint cpp_pag_eventos_autor_fkey
    foreign key (autor_id) references auth.users(id) on update cascade on delete restrict,
  constraint cpp_pag_eventos_conta_scope_fkey
    foreign key (conta_pagar_pessoal_id, empresa_id, proprietario_id)
    references public.contas_pagar_pessoais(id, empresa_id, proprietario_id)
    on update restrict on delete restrict,
  constraint cpp_pag_eventos_estorno_fkey
    foreign key (estorno_de_evento_id, empresa_id, proprietario_id)
    references public.contas_pagar_pessoais_pagamento_eventos(id, empresa_id, proprietario_id)
    on update restrict on delete restrict,
  constraint cpp_pag_eventos_tipo_check
    check (tipo in ('Pagamento','Antecipacao','Entrada','Estorno')),
  constraint cpp_pag_eventos_origem_check
    check ((conta_pagar_pessoal_id is not null)::integer + (entrada_id is not null)::integer = 1),
  constraint cpp_pag_eventos_valores_check
    check (
      valor_nominal > 0 and valor_pago > 0 and desconto_obtido >= 0
      and desconto_obtido = valor_nominal - valor_pago
      and valor_pago <= valor_nominal
    ),
  constraint cpp_pag_eventos_sem_estorno_proprio_check
    check (estorno_de_evento_id is null or estorno_de_evento_id <> id),
  constraint cpp_pag_eventos_coerencia_tipo_check
    check (
      (tipo = 'Pagamento' and conta_pagar_pessoal_id is not null
       and estorno_de_evento_id is null and valor_pago = valor_nominal and desconto_obtido = 0)
      or
      (tipo = 'Antecipacao' and conta_pagar_pessoal_id is not null
       and estorno_de_evento_id is null and valor_pago <= valor_nominal)
      or
      (tipo = 'Entrada' and entrada_id is not null
       and estorno_de_evento_id is null and valor_pago = valor_nominal and desconto_obtido = 0)
      or
      (tipo = 'Estorno' and estorno_de_evento_id is not null)
    ),
  constraint cpp_pag_eventos_idempotency_key
    unique (empresa_id, proprietario_id, idempotency_key),
  constraint cpp_pag_eventos_estorno_unico_key
    unique (estorno_de_evento_id),
  constraint cpp_pag_eventos_scope_key
    unique (id, empresa_id, proprietario_id)
);

comment on table public.contas_pagar_pessoais_pagamento_eventos is
  'Trilha append-only de pagamentos, antecipações, futuras entradas e estornos de obrigações pessoais.';
comment on column public.contas_pagar_pessoais_pagamento_eventos.entrada_id is
  'Reserva estrutural sem FK nesta etapa; evento Entrada permanece bloqueado pela RLS até a migration específica.';
comment on column public.contas_pagar_pessoais_pagamento_eventos.estorno_de_evento_id is
  'Evento original compensado; a unicidade impede mais de um estorno do mesmo evento.';

create index cpp_pag_eventos_conta_idx
  on public.contas_pagar_pessoais_pagamento_eventos
  (proprietario_id, empresa_id, conta_pagar_pessoal_id, criado_em);
create index cpp_pag_eventos_tipo_data_idx
  on public.contas_pagar_pessoais_pagamento_eventos
  (proprietario_id, empresa_id, tipo, pago_em);

alter table public.contas_pagar_pessoais_pagamento_eventos enable row level security;

create policy cpp_pag_eventos_select_tenant
on public.contas_pagar_pessoais_pagamento_eventos
for select to authenticated
using (
  proprietario_id = (select auth.uid())
  and exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = contas_pagar_pessoais_pagamento_eventos.empresa_id
  )
);

create policy cpp_pag_eventos_insert_tenant
on public.contas_pagar_pessoais_pagamento_eventos
for insert to authenticated
with check (
  proprietario_id = (select auth.uid())
  and autor_id = (select auth.uid())
  and tipo in ('Pagamento','Antecipacao','Estorno')
  and exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = contas_pagar_pessoais_pagamento_eventos.empresa_id
  )
);

revoke all privileges on table public.contas_pagar_pessoais_pagamento_eventos from public, anon, authenticated;
grant select, insert on table public.contas_pagar_pessoais_pagamento_eventos to authenticated;

create function public.registrar_pagamento_conta_pessoal(
  p_conta_pagar_pessoal_id uuid,
  p_empresa_id uuid,
  p_proprietario_id uuid,
  p_tipo text,
  p_valor_pago numeric,
  p_pago_em date,
  p_observacoes text,
  p_idempotency_key uuid
)
returns public.contas_pagar_pessoais_pagamento_eventos
language plpgsql
security invoker
set search_path = ''
as $rpc$
declare
  v_uid uuid := (select auth.uid());
  v_conta public.contas_pagar_pessoais%rowtype;
  v_evento public.contas_pagar_pessoais_pagamento_eventos%rowtype;
  v_valor_pago numeric(14,2);
begin
  if v_uid is null or p_proprietario_id is distinct from v_uid then
    raise exception 'Sessão autenticada/proprietário inválido';
  end if;
  if not exists (
    select 1 from public.usuarios u where u.id = v_uid and u.empresa_id = p_empresa_id
  ) then
    raise exception 'Usuário não pertence ao tenant informado';
  end if;
  if p_conta_pagar_pessoal_id is null or p_idempotency_key is null
     or p_tipo is null or p_tipo not in ('Pagamento','Antecipacao') or p_pago_em is null
     or p_valor_pago is null or p_valor_pago <= 0
     or p_valor_pago <> round(p_valor_pago, 2) then
    raise exception 'Dados obrigatórios do pagamento são inválidos';
  end if;

  select * into v_conta
  from public.contas_pagar_pessoais c
  where c.id = p_conta_pagar_pessoal_id
    and c.empresa_id = p_empresa_id
    and c.proprietario_id = p_proprietario_id
  for update;
  if not found then
    raise exception 'Obrigação não encontrada no escopo autenticado';
  end if;

  select * into v_evento
  from public.contas_pagar_pessoais_pagamento_eventos e
  where e.empresa_id = p_empresa_id
    and e.proprietario_id = p_proprietario_id
    and e.idempotency_key = p_idempotency_key;
  if found then
    if v_evento.conta_pagar_pessoal_id is distinct from p_conta_pagar_pessoal_id
       or v_evento.tipo is distinct from p_tipo
       or v_evento.valor_pago is distinct from round(p_valor_pago, 2)
       or v_evento.pago_em is distinct from p_pago_em
       or v_evento.observacoes is distinct from nullif(btrim(p_observacoes), '') then
      raise exception 'Chave idempotente já utilizada com conteúdo divergente';
    end if;
    return v_evento;
  end if;

  if v_conta.status is distinct from 'Pendente' then
    raise exception 'Somente obrigação Pendente pode ser paga';
  end if;
  v_valor_pago := round(p_valor_pago, 2);
  if p_tipo = 'Pagamento' and v_valor_pago is distinct from v_conta.valor then
    raise exception 'Pagamento normal exige valor efetivo igual ao nominal';
  end if;
  if p_tipo = 'Antecipacao' and v_valor_pago > v_conta.valor then
    raise exception 'Antecipação não pode superar o valor nominal';
  end if;

  insert into public.contas_pagar_pessoais_pagamento_eventos (
    empresa_id, proprietario_id, conta_pagar_pessoal_id, tipo,
    valor_nominal, valor_pago, desconto_obtido, pago_em,
    observacoes, idempotency_key, autor_id
  ) values (
    p_empresa_id, p_proprietario_id, p_conta_pagar_pessoal_id, p_tipo,
    v_conta.valor, v_valor_pago, v_conta.valor - v_valor_pago, p_pago_em,
    nullif(btrim(p_observacoes), ''), p_idempotency_key, v_uid
  ) returning * into v_evento;

  update public.contas_pagar_pessoais
  set status = 'Pago'
  where id = v_conta.id and empresa_id = p_empresa_id and proprietario_id = p_proprietario_id;
  if not found then
    raise exception 'Falha fail-closed ao marcar obrigação como Pago';
  end if;
  return v_evento;
end
$rpc$;

create function public.estornar_pagamento_conta_pessoal(
  p_evento_pagamento_id uuid,
  p_empresa_id uuid,
  p_proprietario_id uuid,
  p_estornado_em date,
  p_observacoes text,
  p_idempotency_key uuid
)
returns public.contas_pagar_pessoais_pagamento_eventos
language plpgsql
security invoker
set search_path = ''
as $rpc$
declare
  v_uid uuid := (select auth.uid());
  v_evento_original public.contas_pagar_pessoais_pagamento_eventos%rowtype;
  v_evento_estorno public.contas_pagar_pessoais_pagamento_eventos%rowtype;
  v_conta public.contas_pagar_pessoais%rowtype;
begin
  if v_uid is null or p_proprietario_id is distinct from v_uid then
    raise exception 'Sessão autenticada/proprietário inválido';
  end if;
  if not exists (
    select 1 from public.usuarios u where u.id = v_uid and u.empresa_id = p_empresa_id
  ) then
    raise exception 'Usuário não pertence ao tenant informado';
  end if;
  if p_evento_pagamento_id is null or p_idempotency_key is null or p_estornado_em is null then
    raise exception 'Dados obrigatórios do estorno são inválidos';
  end if;

  select * into v_evento_original
  from public.contas_pagar_pessoais_pagamento_eventos e
  where e.id = p_evento_pagamento_id
    and e.empresa_id = p_empresa_id
    and e.proprietario_id = p_proprietario_id
    and e.tipo in ('Pagamento','Antecipacao');
  if not found or v_evento_original.conta_pagar_pessoal_id is null then
    raise exception 'Evento original de pagamento não encontrado no escopo autenticado';
  end if;

  select * into v_conta
  from public.contas_pagar_pessoais c
  where c.id = v_evento_original.conta_pagar_pessoal_id
    and c.empresa_id = p_empresa_id
    and c.proprietario_id = p_proprietario_id
  for update;
  if not found then
    raise exception 'Obrigação do evento original não encontrada';
  end if;

  select * into v_evento_original
  from public.contas_pagar_pessoais_pagamento_eventos e
  where e.id = p_evento_pagamento_id
    and e.empresa_id = p_empresa_id
    and e.proprietario_id = p_proprietario_id
    and e.tipo in ('Pagamento','Antecipacao');
  if not found then
    raise exception 'Evento original mudou durante o estorno';
  end if;
  if p_estornado_em < v_evento_original.pago_em then
    raise exception 'Data do estorno não pode anteceder o pagamento original';
  end if;

  select * into v_evento_estorno
  from public.contas_pagar_pessoais_pagamento_eventos e
  where e.empresa_id = p_empresa_id
    and e.proprietario_id = p_proprietario_id
    and e.idempotency_key = p_idempotency_key;
  if found then
    if v_evento_estorno.tipo is distinct from 'Estorno'
       or v_evento_estorno.estorno_de_evento_id is distinct from p_evento_pagamento_id
       or v_evento_estorno.pago_em is distinct from p_estornado_em
       or v_evento_estorno.observacoes is distinct from nullif(btrim(p_observacoes), '') then
      raise exception 'Chave idempotente já utilizada com conteúdo divergente';
    end if;
    return v_evento_estorno;
  end if;

  if v_conta.status is distinct from 'Pago' then
    raise exception 'A obrigação do evento não está Pago';
  end if;
  if exists (
    select 1 from public.contas_pagar_pessoais_pagamento_eventos e
    where e.estorno_de_evento_id = p_evento_pagamento_id
  ) then
    raise exception 'Evento original já possui estorno';
  end if;

  insert into public.contas_pagar_pessoais_pagamento_eventos (
    empresa_id, proprietario_id, conta_pagar_pessoal_id, tipo,
    valor_nominal, valor_pago, desconto_obtido, pago_em,
    observacoes, idempotency_key, estorno_de_evento_id, autor_id
  ) values (
    p_empresa_id, p_proprietario_id, v_evento_original.conta_pagar_pessoal_id, 'Estorno',
    v_evento_original.valor_nominal, v_evento_original.valor_pago,
    v_evento_original.desconto_obtido, p_estornado_em,
    nullif(btrim(p_observacoes), ''), p_idempotency_key, p_evento_pagamento_id, v_uid
  ) returning * into v_evento_estorno;

  update public.contas_pagar_pessoais
  set status = 'Pendente'
  where id = v_conta.id and empresa_id = p_empresa_id and proprietario_id = p_proprietario_id;
  if not found then
    raise exception 'Falha fail-closed ao reabrir obrigação';
  end if;
  return v_evento_estorno;
end
$rpc$;

revoke all on function public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid) from public, anon;
grant execute on function public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid) to authenticated;
revoke all on function public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid) from public, anon;
grant execute on function public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid) to authenticated;

comment on function public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid) is
  'Registra pagamento/antecipação pessoal de modo atômico, idempotente e isolado por auth.uid/tenant.';
comment on function public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid) is
  'Cria evento compensatório append-only e reabre a obrigação na mesma transação.';

commit;
