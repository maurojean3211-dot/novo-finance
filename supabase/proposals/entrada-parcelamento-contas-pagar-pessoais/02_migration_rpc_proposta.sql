-- PROPOSTA LOCAL. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
begin;

do $guards$
begin
 if (select count(*) from public.contas_pagar_pessoais)<>43
 or (select count(*) from public.contas_pagar_pessoais where status='Pago')<>21
 or (select count(*) from public.contas_pagar_pessoais where status='Pendente')<>22
 or (select count(*) from public.contas_pagar_pessoais where status='Cancelada')<>0
 or (select sum(valor) from public.contas_pagar_pessoais)<>41574.73
 or (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id is null)<>19
 or (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)<>24
 or (select sum(valor) from public.contas_pagar_pessoais where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)<>31392.00 then
  raise exception 'ABORTADO: histórico ou grupo parcelado atual divergiu';
 end if;
 if to_regclass('public.contas_pagar_pessoais_pagamento_eventos') is null
 or to_regprocedure('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)') is null
 or to_regprocedure('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)') is null
 or (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)<>0 then
  raise exception 'ABORTADO: estrutura de eventos ausente, divergente ou já utilizada';
 end if;
 if (select array_agg(policyname order by policyname) from pg_policies where schemaname='public' and tablename='contas_pagar_pessoais_pagamento_eventos')
  is distinct from array['cpp_pag_eventos_insert_tenant','cpp_pag_eventos_select_tenant']::name[] then
  raise exception 'ABORTADO: policies de eventos divergiram';
 end if;
 if to_regclass('public.contas_pagar_pessoais_entradas') is not null
 or exists(select 1 from information_schema.columns where table_schema='public'
  and table_name='contas_pagar_pessoais' and column_name='entrada_id')
 or to_regprocedure('public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)') is not null then
  raise exception 'ABORTADO: estrutura de entrada já existe total ou parcialmente';
 end if;
end $guards$;

create table public.contas_pagar_pessoais_entradas(
 id uuid primary key default gen_random_uuid(),
 grupo_parcelamento_id uuid not null unique,
 empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
 proprietario_id uuid not null references auth.users(id) on update cascade on delete restrict,
 idempotency_key uuid not null,
 descricao text not null check(length(btrim(descricao))>0),
 fornecedor text,
 valor_total_compra numeric(14,2) not null check(valor_total_compra>0),
 valor_entrada numeric(14,2) not null check(valor_entrada>0),
 saldo_financiado numeric(14,2) not null check(saldo_financiado>0),
 data_entrada date not null,
 parcelas_total integer not null check(parcelas_total between 2 and 120),
 primeiro_vencimento date not null,
 periodicidade text not null check(periodicidade='Mensal'),
 categoria text,
 observacoes text,
 criado_em timestamptz not null default now(),
 constraint contas_pagar_pessoais_entradas_soma_check
  check(valor_entrada<valor_total_compra and valor_entrada+saldo_financiado=valor_total_compra),
 constraint contas_pagar_pessoais_entradas_scope_key unique(id,empresa_id,proprietario_id),
 constraint contas_pagar_pessoais_entradas_idempotency_key unique(empresa_id,proprietario_id,idempotency_key)
);

alter table public.contas_pagar_pessoais add column entrada_id uuid,
 add constraint contas_pagar_pessoais_entrada_scope_fkey
 foreign key(entrada_id,empresa_id,proprietario_id)
 references public.contas_pagar_pessoais_entradas(id,empresa_id,proprietario_id)
 on update restrict on delete restrict;
create index contas_pagar_pessoais_entrada_idx
 on public.contas_pagar_pessoais(proprietario_id,empresa_id,entrada_id)
 where entrada_id is not null;

alter table public.contas_pagar_pessoais_pagamento_eventos
 add constraint cpp_pag_eventos_entrada_scope_fkey
 foreign key(entrada_id,empresa_id,proprietario_id)
 references public.contas_pagar_pessoais_entradas(id,empresa_id,proprietario_id)
 on update restrict on delete restrict;
create unique index cpp_pag_eventos_entrada_unica_idx
 on public.contas_pagar_pessoais_pagamento_eventos(entrada_id)
 where tipo='Entrada';

alter table public.contas_pagar_pessoais_entradas enable row level security;
create policy contas_pagar_pessoais_entradas_select on public.contas_pagar_pessoais_entradas
 for select to authenticated using(proprietario_id=(select auth.uid()) and exists(
  select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_entradas.empresa_id));
create policy contas_pagar_pessoais_entradas_insert on public.contas_pagar_pessoais_entradas
 for insert to authenticated with check(proprietario_id=(select auth.uid()) and exists(
  select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_entradas.empresa_id));
revoke all on public.contas_pagar_pessoais_entradas from public,anon,authenticated;
grant select,insert on public.contas_pagar_pessoais_entradas to authenticated;

drop policy cpp_pag_eventos_insert_tenant on public.contas_pagar_pessoais_pagamento_eventos;
create policy cpp_pag_eventos_insert_tenant on public.contas_pagar_pessoais_pagamento_eventos
 for insert to authenticated with check(
  proprietario_id=(select auth.uid()) and autor_id=(select auth.uid())
  and tipo in ('Pagamento','Antecipacao','Estorno','Entrada')
  and exists(select 1 from public.usuarios u where u.id=(select auth.uid())
   and u.empresa_id=contas_pagar_pessoais_pagamento_eventos.empresa_id)
  and (tipo<>'Entrada' or exists(select 1 from public.contas_pagar_pessoais_entradas e
   where e.id=contas_pagar_pessoais_pagamento_eventos.entrada_id
    and e.empresa_id=contas_pagar_pessoais_pagamento_eventos.empresa_id
    and e.proprietario_id=contas_pagar_pessoais_pagamento_eventos.proprietario_id))
 );

create function public.criar_parcelamento_conta_pessoal_com_entrada(
 p_empresa_id uuid,p_proprietario_id uuid,p_idempotency_key uuid,
 p_descricao text,p_fornecedor text,p_valor_total numeric,p_valor_entrada numeric,
 p_data_entrada date,p_quantidade integer,p_primeiro_vencimento date,
 p_periodicidade text,p_categoria text,p_observacoes text)
returns setof public.contas_pagar_pessoais language plpgsql security invoker set search_path=''
as $rpc$
declare
 v_header public.contas_pagar_pessoais_entradas%rowtype;
 v_grupo uuid:=gen_random_uuid();v_total bigint;v_entrada bigint;v_saldo bigint;v_base bigint;v_valor bigint;
 v_mes date;v_vencimento date;v_dia integer:=extract(day from p_primeiro_vencimento)::integer;i integer;
begin
 if p_proprietario_id is distinct from (select auth.uid()) or not exists(select 1 from public.usuarios u
  where u.id=(select auth.uid()) and u.empresa_id=p_empresa_id) then raise exception 'Escopo autenticado divergente'; end if;
 if p_idempotency_key is null or nullif(btrim(p_descricao),'') is null or p_data_entrada is null
 or p_primeiro_vencimento is null or p_periodicidade is distinct from 'Mensal'
 or p_quantidade is null or p_quantidade not between 2 and 120
 or p_valor_total is null or p_valor_entrada is null then raise exception 'Dados obrigatórios inválidos'; end if;
 v_total:=round(p_valor_total*100)::bigint;v_entrada:=round(p_valor_entrada*100)::bigint;v_saldo:=v_total-v_entrada;
 if v_total<=0 or v_entrada<=0 or v_saldo<=0 or v_saldo<p_quantidade then raise exception 'Valores da entrada/saldo inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text,0));
 select * into v_header from public.contas_pagar_pessoais_entradas e
  where e.empresa_id=p_empresa_id and e.proprietario_id=p_proprietario_id and e.idempotency_key=p_idempotency_key;
 if found then
  if v_header.descricao is distinct from btrim(p_descricao) or v_header.fornecedor is distinct from nullif(btrim(p_fornecedor),'')
   or v_header.valor_total_compra is distinct from v_total/100.0 or v_header.valor_entrada is distinct from v_entrada/100.0
   or v_header.data_entrada is distinct from p_data_entrada or v_header.parcelas_total is distinct from p_quantidade
   or v_header.primeiro_vencimento is distinct from p_primeiro_vencimento
   or v_header.periodicidade is distinct from 'Mensal'
   or v_header.categoria is distinct from nullif(btrim(p_categoria),'')
   or v_header.observacoes is distinct from nullif(btrim(p_observacoes),'')
   or (select count(*) from public.contas_pagar_pessoais p where p.entrada_id=v_header.id)<>p_quantidade
   or (select sum(p.valor) from public.contas_pagar_pessoais p where p.entrada_id=v_header.id)<>v_saldo/100.0
   or (select count(*) from public.contas_pagar_pessoais_pagamento_eventos e where e.entrada_id=v_header.id and e.tipo='Entrada'
       and e.valor_nominal=v_header.valor_entrada and e.valor_pago=v_header.valor_entrada
       and e.desconto_obtido=0 and e.pago_em=v_header.data_entrada)<>1
   then raise exception 'Chave idempotente com conteúdo ou lote divergente'; end if;
  return query select p.* from public.contas_pagar_pessoais p where p.entrada_id=v_header.id
   and p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id order by p.parcela_numero;return;
 end if;
 insert into public.contas_pagar_pessoais_entradas(grupo_parcelamento_id,empresa_id,proprietario_id,idempotency_key,
  descricao,fornecedor,valor_total_compra,valor_entrada,saldo_financiado,data_entrada,parcelas_total,primeiro_vencimento,
  periodicidade,categoria,observacoes)
 values(v_grupo,p_empresa_id,p_proprietario_id,p_idempotency_key,btrim(p_descricao),nullif(btrim(p_fornecedor),''),
  v_total/100.0,v_entrada/100.0,v_saldo/100.0,p_data_entrada,p_quantidade,p_primeiro_vencimento,'Mensal',
  nullif(btrim(p_categoria),''),nullif(btrim(p_observacoes),'')) returning * into v_header;
 v_base:=v_saldo/p_quantidade;
 for i in 1..p_quantidade loop
  v_valor:=case when i=p_quantidade then v_saldo-v_base*(p_quantidade-1) else v_base end;
  v_mes:=(date_trunc('month',p_primeiro_vencimento)::date+make_interval(months=>i-1))::date;
  v_vencimento:=v_mes+least(v_dia,extract(day from(v_mes+interval '1 month - 1 day'))::integer)-1;
  insert into public.contas_pagar_pessoais(empresa_id,proprietario_id,descricao,fornecedor,valor,vencimento,status,
   categoria,observacoes,grupo_parcelamento_id,parcela_numero,parcelas_total,valor_total_compra,periodicidade,
   idempotency_key,entrada_id)
  values(p_empresa_id,p_proprietario_id,btrim(p_descricao),nullif(btrim(p_fornecedor),''),v_valor/100.0,
   v_vencimento,'Pendente',nullif(btrim(p_categoria),''),nullif(btrim(p_observacoes),''),v_grupo,i,p_quantidade,
   v_total/100.0,'Mensal',p_idempotency_key,v_header.id);
 end loop;
 insert into public.contas_pagar_pessoais_pagamento_eventos(
  empresa_id,proprietario_id,entrada_id,tipo,valor_nominal,valor_pago,desconto_obtido,pago_em,
  observacoes,idempotency_key,autor_id)
 values(p_empresa_id,p_proprietario_id,v_header.id,'Entrada',v_entrada/100.0,v_entrada/100.0,0,p_data_entrada,
  nullif(btrim(p_observacoes),''),p_idempotency_key,(select auth.uid()));
 return query select p.* from public.contas_pagar_pessoais p where p.entrada_id=v_header.id
  and p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id order by p.parcela_numero;
end $rpc$;
revoke all on function public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text) from public,anon;
grant execute on function public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text) to authenticated;
commit;
