-- PROPOSTA LOCAL. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPRESSA.
begin;

do $guards$
begin
 if (select count(*) from public.contas_pagar_pessoais)<>19
 or (select count(*) from public.contas_pagar_pessoais where status='Pago')<>16
 or (select count(*) from public.contas_pagar_pessoais where status='Pendente')<>3
 or (select count(*) from public.contas_pagar_pessoais where status='Cancelada')<>0
 or (select coalesce(sum(valor),0) from public.contas_pagar_pessoais)<>10182.73
 or (select count(distinct source_legacy_id) from public.contas_pagar_pessoais)<>19 then
  raise exception 'ABORTADO: estado dos 19 registros divergiu';
 end if;
 if exists(select 1 from information_schema.columns where table_schema='public'
  and table_name='contas_pagar_pessoais' and column_name in
  ('grupo_parcelamento_id','parcela_numero','parcelas_total','valor_total_compra','periodicidade','idempotency_key'))
 or to_regprocedure('public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text)') is not null then
  raise exception 'ABORTADO: estrutura de parcelamento já existe total ou parcialmente';
 end if;
end $guards$;

alter table public.contas_pagar_pessoais
 add column grupo_parcelamento_id uuid,
 add column parcela_numero integer,
 add column parcelas_total integer,
 add column valor_total_compra numeric(14,2),
 add column periodicidade text,
 add column idempotency_key uuid,
 add constraint contas_pagar_pessoais_parcelamento_completo_check check(
  (grupo_parcelamento_id is null and parcela_numero is null and parcelas_total is null
   and valor_total_compra is null and periodicidade is null and idempotency_key is null)
  or
  (grupo_parcelamento_id is not null and parcela_numero is not null and parcelas_total is not null
   and valor_total_compra is not null and periodicidade is not null and idempotency_key is not null)),
 add constraint contas_pagar_pessoais_parcela_numero_check check(
  parcela_numero is null or (parcela_numero>=1 and parcela_numero<=parcelas_total)),
 add constraint contas_pagar_pessoais_parcelas_total_check check(
  parcelas_total is null or parcelas_total between 2 and 120),
 add constraint contas_pagar_pessoais_valor_total_compra_check check(
  valor_total_compra is null or valor_total_compra>0),
 add constraint contas_pagar_pessoais_periodicidade_check check(
  periodicidade is null or periodicidade='Mensal');

create unique index contas_pagar_pessoais_grupo_parcela_key
 on public.contas_pagar_pessoais(empresa_id,proprietario_id,grupo_parcelamento_id,parcela_numero)
 where grupo_parcelamento_id is not null;
create unique index contas_pagar_pessoais_idempotency_parcela_key
 on public.contas_pagar_pessoais(empresa_id,proprietario_id,idempotency_key,parcela_numero)
 where idempotency_key is not null;
create index contas_pagar_pessoais_grupo_idx
 on public.contas_pagar_pessoais(proprietario_id,empresa_id,grupo_parcelamento_id,vencimento)
 where grupo_parcelamento_id is not null;

create function public.criar_parcelamento_conta_pessoal(
 p_empresa_id uuid,p_proprietario_id uuid,p_idempotency_key uuid,
 p_descricao text,p_fornecedor text,p_valor_total numeric,p_quantidade integer,
 p_valor_primeira_parcela numeric,p_primeiro_vencimento date,p_periodicidade text,
 p_categoria text,p_observacoes text)
returns setof public.contas_pagar_pessoais
language plpgsql security invoker set search_path=''
as $rpc$
declare
 v_grupo uuid:=gen_random_uuid();
 v_total_centavos bigint;
 v_primeira_centavos bigint;
 v_saldo_centavos bigint;
 v_base_centavos bigint;
 v_valor_centavos bigint;
 v_mes date;
 v_vencimento date;
 v_dia integer:=extract(day from p_primeiro_vencimento)::integer;
 v_existentes integer;
 i integer;
begin
 if p_proprietario_id is distinct from (select auth.uid()) then
  raise exception 'Proprietário divergente da sessão autenticada';
 end if;
 if not exists(select 1 from public.usuarios u
  where u.id=(select auth.uid()) and u.empresa_id=p_empresa_id) then
  raise exception 'Usuário não pertence ao tenant informado';
 end if;
 if p_idempotency_key is null or nullif(btrim(p_descricao),'') is null
 or p_valor_total is null or p_valor_total<=0
 or p_quantidade is null or p_quantidade not between 2 and 120
 or p_primeiro_vencimento is null or p_periodicidade is distinct from 'Mensal' then
  raise exception 'Dados obrigatórios do parcelamento são inválidos';
 end if;

 v_total_centavos:=round(p_valor_total*100)::bigint;
 v_primeira_centavos:=case when p_valor_primeira_parcela is null
  then v_total_centavos/p_quantidade else round(p_valor_primeira_parcela*100)::bigint end;
 if v_primeira_centavos<=0 or v_primeira_centavos>=v_total_centavos then
  raise exception 'Valor da primeira parcela inválido';
 end if;

 perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text,0));
 select count(*) into v_existentes from public.contas_pagar_pessoais p
 where p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id
  and p.idempotency_key=p_idempotency_key;
 if v_existentes>0 then
  if v_existentes<>p_quantidade
  or (select sum(p.valor) from public.contas_pagar_pessoais p where p.empresa_id=p_empresa_id
      and p.proprietario_id=p_proprietario_id and p.idempotency_key=p_idempotency_key)<>round(p_valor_total,2)
  or (select min(p.vencimento) from public.contas_pagar_pessoais p where p.empresa_id=p_empresa_id
      and p.proprietario_id=p_proprietario_id and p.idempotency_key=p_idempotency_key) is distinct from p_primeiro_vencimento
  or (select p.valor from public.contas_pagar_pessoais p where p.empresa_id=p_empresa_id
      and p.proprietario_id=p_proprietario_id and p.idempotency_key=p_idempotency_key
      and p.parcela_numero=1) is distinct from v_primeira_centavos/100.0
  or exists(select 1 from public.contas_pagar_pessoais p where p.empresa_id=p_empresa_id
      and p.proprietario_id=p_proprietario_id and p.idempotency_key=p_idempotency_key
      and (p.descricao is distinct from btrim(p_descricao)
       or p.fornecedor is distinct from nullif(btrim(p_fornecedor),'')
       or p.categoria is distinct from nullif(btrim(p_categoria),'')
       or p.observacoes is distinct from nullif(btrim(p_observacoes),'')
       or p.parcelas_total is distinct from p_quantidade
       or p.valor_total_compra is distinct from round(p_valor_total,2)
       or p.periodicidade is distinct from 'Mensal')) then
   raise exception 'Chave idempotente já usada com conteúdo divergente';
  end if;
  return query select p.* from public.contas_pagar_pessoais p
   where p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id
    and p.idempotency_key=p_idempotency_key order by p.parcela_numero;
  return;
 end if;

 v_saldo_centavos:=v_total_centavos-v_primeira_centavos;
 v_base_centavos:=v_saldo_centavos/(p_quantidade-1);
 for i in 1..p_quantidade loop
  v_valor_centavos:=case when i=1 then v_primeira_centavos
   when i=p_quantidade then v_saldo_centavos-v_base_centavos*(p_quantidade-2)
   else v_base_centavos end;
  if v_valor_centavos<=0 then raise exception 'A divisão produziria parcela sem valor positivo'; end if;
  v_mes:=(date_trunc('month',p_primeiro_vencimento)::date+make_interval(months=>i-1))::date;
  v_vencimento:=v_mes+least(v_dia,extract(day from (v_mes+interval '1 month - 1 day'))::integer)-1;
  insert into public.contas_pagar_pessoais(
   empresa_id,proprietario_id,descricao,fornecedor,valor,vencimento,status,categoria,observacoes,
   grupo_parcelamento_id,parcela_numero,parcelas_total,valor_total_compra,periodicidade,idempotency_key)
  values(p_empresa_id,p_proprietario_id,btrim(p_descricao),nullif(btrim(p_fornecedor),''),
   v_valor_centavos/100.0,v_vencimento,'Pendente',nullif(btrim(p_categoria),''),nullif(btrim(p_observacoes),''),
   v_grupo,i,p_quantidade,v_total_centavos/100.0,'Mensal',p_idempotency_key);
 end loop;
 return query select p.* from public.contas_pagar_pessoais p
  where p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id
   and p.grupo_parcelamento_id=v_grupo order by p.parcela_numero;
end $rpc$;

revoke all on function public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text) from public;
revoke all on function public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text) from anon;
grant execute on function public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text) to authenticated;
comment on function public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text)
 is 'Cria parcelas pessoais em uma transação, isoladas por auth.uid/tenant e idempotentes por confirmação.';
commit;
