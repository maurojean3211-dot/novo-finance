-- PROPOSTA LOCAL. NÃO EXECUTAR SEM NOVA AUTORIZAÇÃO EXPRESSA.
begin;

do $guards$
declare
 v_policies name[];
 v_policy_fingerprint text;
begin
 if (select count(*) from public.despesas)<>11
 or (select count(*) from public.despesas where tipo='receita')<>8
 or (select sum(valor) from public.despesas where tipo='receita')<>14396
 or (select count(*) from public.despesas where tipo='despesa')<>3
 or (select sum(valor) from public.despesas where tipo='despesa')<>1585.80
 or (select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.despesas d)<>
    'fe48fb20456c0ed9bb3b9a70fc26e5ae'
 or (select md5(string_agg(to_jsonb(d)::text,'|' order by id) filter(where tipo='receita'))
     from public.despesas d)<>'4bf9a5ab8acf5c294ffeda87ebf26eb5'
 or (select md5(string_agg(to_jsonb(d)::text,'|' order by id) filter(where tipo='despesa'))
     from public.despesas d)<>'a196c2193f6f0402c11f8404072fc374' then
  raise exception 'ABORTADO: os onze registros atuais de despesas divergiram';
 end if;
 if (select count(*) from public.contas_pagar_pessoais)<>43
 or (select count(*) from public.contas_pagar_pessoais where status='Pago')<>21
 or (select count(*) from public.contas_pagar_pessoais where status='Pendente')<>22
 or (select sum(valor) from public.contas_pagar_pessoais)<>41574.73
 or (select md5(string_agg(to_jsonb(p)::text,'|' order by id)) from public.contas_pagar_pessoais p)
    <>'66e1af3fb3bd3acdd7482f0b8f1335f8' then
  raise exception 'ABORTADO: obrigações pessoais divergiram';
 end if;
 if (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)<>1
 or (select count(*) from public.contas_pagar_pessoais_entradas)<>1
 or (select count(*) from public.contas_pagar_pessoais_pagamento_eventos
     where tipo in ('Pagamento','Antecipacao','Estorno'))<>0 then
  raise exception 'ABORTADO: quantidade/tipo de eventos ou entradas divergiram';
 end if;
 if (select count(*) from public.contas_pagar_pessoais_pagamento_eventos e where
  e.id='810ee061-bfcf-4377-aa0c-de13d164bd3b'::uuid
  and e.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and e.proprietario_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and e.conta_pagar_pessoal_id is null
  and e.entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid
  and e.tipo='Entrada' and e.valor_nominal=8750 and e.valor_pago=8750 and e.desconto_obtido=0
  and e.pago_em=date '2026-04-27'
  and e.idempotency_key='52e20038-b0fc-4465-8727-cb1a48072c37'::uuid
  and e.estorno_de_evento_id is null and e.autor_id=e.proprietario_id
  and md5(to_jsonb(e)::text)='e8c42a74a4b25768ed5f9882e0d894de')<>1 then
  raise exception 'ABORTADO: evento conhecido da entrada da moto divergiu';
 end if;
 if (select count(*) from public.contas_pagar_pessoais_entradas h where
  h.id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid
  and h.grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid
  and h.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and h.proprietario_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and h.idempotency_key='52e20038-b0fc-4465-8727-cb1a48072c37'::uuid
  and h.descricao='MOTO CBR 300' and h.fornecedor='BANCO PAN'
  and h.valor_total_compra=40142 and h.valor_entrada=8750 and h.saldo_financiado=31392
  and h.data_entrada=date '2026-04-27' and h.parcelas_total=24
  and h.primeiro_vencimento=date '2026-05-27' and h.periodicidade='Mensal'
  and md5(to_jsonb(h)::text)='22dd1f59b6c45c64754e5e890f5f5826')<>1 then
  raise exception 'ABORTADO: cabeçalho conhecido da entrada da moto divergiu';
 end if;
 if (select count(*) from public.contas_pagar_pessoais
     where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid)<>24
 or (select sum(valor) from public.contas_pagar_pessoais
     where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid)<>31392
 or (select count(*) from public.contas_pagar_pessoais
     where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid and status='Pago')<>5
 or (select count(*) from public.contas_pagar_pessoais
     where entrada_id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid and status='Pendente')<>19 then
  raise exception 'ABORTADO: parcelas vinculadas à entrada da moto divergiram';
 end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='despesas'
  and column_name in ('proprietario_id','pagamento_evento_id','origem_tipo','estorno_evento_id','estornada_em')) then
  raise exception 'ABORTADO: estrutura de integração já existe total ou parcialmente';
 end if;
 select array_agg(policyname order by policyname) into v_policies from pg_policies
 where schemaname='public' and tablename='despesas';
 if v_policies is distinct from array['despesas_delete_tenant','despesas_insert_tenant',
  'despesas_select_tenant','despesas_update_tenant']::name[] then
  raise exception 'ABORTADO: policies de despesas divergiram: %',v_policies;
 end if;
 select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) into v_policy_fingerprint
 from (select policyname,cmd,roles,permissive,qual,with_check from pg_policies
  where schemaname='public' and tablename='despesas') x;
 if v_policy_fingerprint is distinct from 'f7fdc53d58a8e80da08040d7d19ef559'
 or not (select relrowsecurity from pg_class where oid='public.despesas'::regclass) then
  raise exception 'ABORTADO: fingerprint/RLS de despesas divergiu';
 end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename in
  ('despesas','contas_pagar_pessoais_pagamento_eventos','contas_pagar_pessoais_entradas')
  and (coalesce(btrim(qual),'') in ('true','(true)')
   or coalesce(btrim(with_check),'') in ('true','(true)'))) then
  raise exception 'ABORTADO: policy ampla encontrada';
 end if;
 if not (select relrowsecurity from pg_class
  where oid='public.contas_pagar_pessoais_pagamento_eventos'::regclass)
 or not (select relrowsecurity from pg_class
  where oid='public.contas_pagar_pessoais_entradas'::regclass)
 or (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais_pagamento_eventos') x)
    <>'706125c655e0432559190e3d3c69d671'
 or (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais_entradas') x)
    <>'5b039610b1c0def3c2926c45e1d58a4c' then
  raise exception 'ABORTADO: RLS/policies de eventos ou entradas divergiram';
 end if;
 if not has_table_privilege('authenticated','public.contas_pagar_pessoais_pagamento_eventos','SELECT,INSERT')
 or has_table_privilege('authenticated','public.contas_pagar_pessoais_pagamento_eventos','UPDATE,DELETE')
 or not has_table_privilege('authenticated','public.contas_pagar_pessoais_entradas','SELECT,INSERT')
 or has_table_privilege('authenticated','public.contas_pagar_pessoais_entradas','UPDATE,DELETE')
 or has_table_privilege('anon','public.contas_pagar_pessoais_pagamento_eventos','SELECT,INSERT,UPDATE,DELETE')
 or has_table_privilege('anon','public.contas_pagar_pessoais_entradas','SELECT,INSERT,UPDATE,DELETE')
 or exists(select 1 from pg_class c where c.oid in (
   'public.contas_pagar_pessoais_pagamento_eventos'::regclass,
   'public.contas_pagar_pessoais_entradas'::regclass)
   and exists(select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
    where a.grantee=0)) then
  raise exception 'ABORTADO: privilégios de eventos ou entradas divergiram';
 end if;
 if to_regprocedure('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)') is null
 or to_regprocedure('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)') is null
 or to_regprocedure('public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)') is null then
  raise exception 'ABORTADO: RPC obrigatória ausente';
 end if;
 if (select md5(pg_get_functiondef('public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)'::regprocedure)))
    <>'11aef200290b71bc86ae5869ea7ac394'
 or (select md5(pg_get_functiondef('public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)'::regprocedure)))
    <>'f10da628279aa80dffa659f9793bfa1f'
 or (select md5(pg_get_functiondef('public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)'::regprocedure)))
    <>'7bb363dde40fcc39a0d9ab8a19a35e81' then
  raise exception 'ABORTADO: definição das RPCs atuais divergiu';
 end if;
 if exists(select 1 from pg_proc p where p.oid in (
   'public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid)'::regprocedure,
   'public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid)'::regprocedure,
   'public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text)'::regprocedure)
  and (p.prosecdef or not coalesce(p.proconfig,'{}'::text[]) @> array['search_path=""']::text[]
   or not has_function_privilege('authenticated',p.oid,'EXECUTE')
   or has_function_privilege('anon',p.oid,'EXECUTE')
   or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where a.grantee=0 and a.privilege_type='EXECUTE'))) then
  raise exception 'ABORTADO: segurança/privilégios das RPCs atuais divergiram';
 end if;
 if to_regprocedure('public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)') is not null then
  raise exception 'ABORTADO: RPC de materialização da entrada já existe';
 end if;
 if exists(select 1 from public.despesas d where d.tipo='despesa' and d.valor=8750
  and d.data_lancamento=date '2026-04-27'
  and d.empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid) then
  raise exception 'ABORTADO: possível despesa da entrada já existe sem vínculo';
 end if;
end $guards$;

alter table public.contas_pagar_pessoais_pagamento_eventos
 add constraint cpp_pag_eventos_origem_tipo_scope_key unique(id,tipo,empresa_id,proprietario_id),
 add constraint cpp_pag_eventos_estorno_scope_key unique(id,estorno_de_evento_id,empresa_id,proprietario_id);

alter table public.despesas
 add column proprietario_id uuid,
 add column pagamento_evento_id uuid,
 add column origem_tipo text,
 add column estorno_evento_id uuid,
 add column estornada_em date,
 add constraint despesas_integracao_proprietario_fkey foreign key(proprietario_id)
  references auth.users(id) on update cascade on delete restrict,
 add constraint despesas_pagamento_evento_fkey
  foreign key(pagamento_evento_id,origem_tipo,empresa_id,proprietario_id)
  references public.contas_pagar_pessoais_pagamento_eventos(id,tipo,empresa_id,proprietario_id)
  on update restrict on delete restrict,
 add constraint despesas_estorno_evento_fkey
  foreign key(estorno_evento_id,pagamento_evento_id,empresa_id,proprietario_id)
  references public.contas_pagar_pessoais_pagamento_eventos(id,estorno_de_evento_id,empresa_id,proprietario_id)
  on update restrict on delete restrict,
 add constraint despesas_pagamento_evento_key unique(pagamento_evento_id),
 add constraint despesas_estorno_evento_key unique(estorno_evento_id),
 add constraint despesas_integracao_all_or_none_check check(
  (pagamento_evento_id is null and proprietario_id is null and origem_tipo is null
   and estorno_evento_id is null and estornada_em is null)
  or
  (pagamento_evento_id is not null and proprietario_id is not null
   and origem_tipo in ('Pagamento','Antecipacao','Entrada') and tipo='despesa' and valor>0
   and ((estorno_evento_id is null and estornada_em is null and ativo is true)
    or (estorno_evento_id is not null and estornada_em is not null and ativo is false)))
 );

create index despesas_integracao_escopo_idx
 on public.despesas(proprietario_id,empresa_id,data_lancamento)
 where pagamento_evento_id is not null;

create function public.validar_despesa_evento_pessoal()
returns trigger language plpgsql security invoker set search_path=''
as $trigger$
declare v_evento public.contas_pagar_pessoais_pagamento_eventos%rowtype;
begin
 if tg_op='DELETE' then
  if old.pagamento_evento_id is not null then raise exception 'Despesa integrada não pode ser excluída'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and old.pagamento_evento_id is null and new.pagamento_evento_id is not null then
  raise exception 'Despesa manual não pode ser convertida em integrada por UPDATE';
 end if;
 if tg_op='UPDATE' and old.pagamento_evento_id is not null then
  if new.pagamento_evento_id is distinct from old.pagamento_evento_id
   or new.empresa_id is distinct from old.empresa_id or new.proprietario_id is distinct from old.proprietario_id
   or new.origem_tipo is distinct from old.origem_tipo or new.tipo is distinct from old.tipo
   or new.valor is distinct from old.valor or new.data_lancamento is distinct from old.data_lancamento then
   raise exception 'Campos financeiros/rastreáveis da despesa integrada são imutáveis';
  end if;
  if old.ativo is false and (new.ativo is distinct from old.ativo
   or new.estorno_evento_id is distinct from old.estorno_evento_id
   or new.estornada_em is distinct from old.estornada_em) then
   raise exception 'Estorno de despesa integrada é imutável';
  end if;
 end if;
 if new.pagamento_evento_id is not null then
  select * into v_evento from public.contas_pagar_pessoais_pagamento_eventos e
  where e.id=new.pagamento_evento_id and e.empresa_id=new.empresa_id
   and e.proprietario_id=new.proprietario_id and e.tipo=new.origem_tipo;
  if not found or v_evento.tipo not in ('Pagamento','Antecipacao','Entrada')
   or new.valor is distinct from v_evento.valor_pago or new.data_lancamento is distinct from v_evento.pago_em then
   raise exception 'Despesa integrada diverge do evento financeiro elegível';
  end if;
 end if;
 return new;
end $trigger$;
create trigger despesas_evento_pessoal_integridade
before insert or update or delete on public.despesas
for each row execute function public.validar_despesa_evento_pessoal();
revoke all on function public.validar_despesa_evento_pessoal() from public,anon;
grant execute on function public.validar_despesa_evento_pessoal() to authenticated;

drop policy despesas_select_tenant on public.despesas;
drop policy despesas_insert_tenant on public.despesas;
drop policy despesas_update_tenant on public.despesas;
drop policy despesas_delete_tenant on public.despesas;
create policy despesas_select_tenant on public.despesas for select to authenticated using(
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id)
 and (proprietario_id is null or proprietario_id=(select auth.uid())));
create policy despesas_insert_tenant on public.despesas for insert to authenticated with check(
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id)
 and (proprietario_id is null or proprietario_id=(select auth.uid())));
create policy despesas_update_tenant on public.despesas for update to authenticated using(
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id)
 and (proprietario_id is null or proprietario_id=(select auth.uid()))) with check(
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id)
 and (proprietario_id is null or proprietario_id=(select auth.uid())));
create policy despesas_delete_tenant on public.despesas for delete to authenticated using(
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id)
 and proprietario_id is null and pagamento_evento_id is null);

create or replace function public.registrar_pagamento_conta_pessoal(
 p_conta_pagar_pessoal_id uuid,p_empresa_id uuid,p_proprietario_id uuid,p_tipo text,
 p_valor_pago numeric,p_pago_em date,p_observacoes text,p_idempotency_key uuid)
returns public.contas_pagar_pessoais_pagamento_eventos language plpgsql security invoker set search_path=''
as $rpc$
declare v_uid uuid:=(select auth.uid());v_conta public.contas_pagar_pessoais%rowtype;
 v_evento public.contas_pagar_pessoais_pagamento_eventos%rowtype;v_valor_pago numeric(14,2);
begin
 if v_uid is null or p_proprietario_id is distinct from v_uid then raise exception 'Sessão autenticada/proprietário inválido'; end if;
 if not exists(select 1 from public.usuarios u where u.id=v_uid and u.empresa_id=p_empresa_id) then raise exception 'Usuário não pertence ao tenant informado'; end if;
 if p_conta_pagar_pessoal_id is null or p_idempotency_key is null or p_tipo not in ('Pagamento','Antecipacao')
 or p_pago_em is null or p_valor_pago is null or p_valor_pago<=0 or p_valor_pago<>round(p_valor_pago,2) then raise exception 'Dados obrigatórios do pagamento são inválidos'; end if;
 select * into v_conta from public.contas_pagar_pessoais c where c.id=p_conta_pagar_pessoal_id
  and c.empresa_id=p_empresa_id and c.proprietario_id=p_proprietario_id for update;
 if not found then raise exception 'Obrigação não encontrada no escopo autenticado'; end if;
 select * into v_evento from public.contas_pagar_pessoais_pagamento_eventos e where e.empresa_id=p_empresa_id
  and e.proprietario_id=p_proprietario_id and e.idempotency_key=p_idempotency_key;
 if found then
  if v_evento.conta_pagar_pessoal_id is distinct from p_conta_pagar_pessoal_id or v_evento.tipo is distinct from p_tipo
   or v_evento.valor_pago is distinct from round(p_valor_pago,2) or v_evento.pago_em is distinct from p_pago_em
   or v_evento.observacoes is distinct from nullif(btrim(p_observacoes),'')
   or (select count(*) from public.despesas d where d.pagamento_evento_id=v_evento.id and d.empresa_id=p_empresa_id
    and d.proprietario_id=p_proprietario_id and d.origem_tipo=v_evento.tipo and d.valor=v_evento.valor_pago
    and d.data_lancamento=v_evento.pago_em and d.ativo is true)<>1 then
    raise exception 'Chave idempotente com evento/despesa divergente'; end if;
  return v_evento;
 end if;
 if v_conta.status is distinct from 'Pendente' then raise exception 'Somente obrigação Pendente pode ser paga'; end if;
 v_valor_pago:=round(p_valor_pago,2);
 if p_tipo='Pagamento' and v_valor_pago is distinct from v_conta.valor then raise exception 'Pagamento normal exige valor efetivo igual ao nominal'; end if;
 if p_tipo='Antecipacao' and v_valor_pago>v_conta.valor then raise exception 'Antecipação não pode superar o valor nominal'; end if;
 insert into public.contas_pagar_pessoais_pagamento_eventos(empresa_id,proprietario_id,conta_pagar_pessoal_id,tipo,
  valor_nominal,valor_pago,desconto_obtido,pago_em,observacoes,idempotency_key,autor_id)
 values(p_empresa_id,p_proprietario_id,p_conta_pagar_pessoal_id,p_tipo,v_conta.valor,v_valor_pago,
  v_conta.valor-v_valor_pago,p_pago_em,nullif(btrim(p_observacoes),''),p_idempotency_key,v_uid) returning * into v_evento;
 insert into public.despesas(tipo,categoria,descricao,valor,data_lancamento,empresa_id,proprietario_id,ativo,
  pagamento_evento_id,origem_tipo)
 values('despesa',coalesce(nullif(btrim(v_conta.categoria),''),'Contas a pagar'),v_conta.descricao,
  v_evento.valor_pago,v_evento.pago_em,p_empresa_id,p_proprietario_id,true,v_evento.id,v_evento.tipo);
 update public.contas_pagar_pessoais set status='Pago' where id=v_conta.id and empresa_id=p_empresa_id and proprietario_id=p_proprietario_id;
 if not found then raise exception 'Falha fail-closed ao marcar obrigação como Pago'; end if;
 return v_evento;
end $rpc$;

create or replace function public.estornar_pagamento_conta_pessoal(
 p_evento_pagamento_id uuid,p_empresa_id uuid,p_proprietario_id uuid,p_estornado_em date,
 p_observacoes text,p_idempotency_key uuid)
returns public.contas_pagar_pessoais_pagamento_eventos language plpgsql security invoker set search_path=''
as $rpc$
declare v_uid uuid:=(select auth.uid());v_original public.contas_pagar_pessoais_pagamento_eventos%rowtype;
 v_estorno public.contas_pagar_pessoais_pagamento_eventos%rowtype;v_conta public.contas_pagar_pessoais%rowtype;
begin
 if v_uid is null or p_proprietario_id is distinct from v_uid then raise exception 'Sessão autenticada/proprietário inválido'; end if;
 if not exists(select 1 from public.usuarios u where u.id=v_uid and u.empresa_id=p_empresa_id) then raise exception 'Usuário não pertence ao tenant informado'; end if;
 if p_evento_pagamento_id is null or p_idempotency_key is null or p_estornado_em is null then raise exception 'Dados obrigatórios do estorno são inválidos'; end if;
 select * into v_original from public.contas_pagar_pessoais_pagamento_eventos e where e.id=p_evento_pagamento_id
  and e.empresa_id=p_empresa_id and e.proprietario_id=p_proprietario_id and e.tipo in ('Pagamento','Antecipacao');
 if not found or v_original.conta_pagar_pessoal_id is null then raise exception 'Evento original não encontrado'; end if;
 select * into v_conta from public.contas_pagar_pessoais c where c.id=v_original.conta_pagar_pessoal_id
  and c.empresa_id=p_empresa_id and c.proprietario_id=p_proprietario_id for update;
 if not found then raise exception 'Obrigação do evento original não encontrada'; end if;
 select * into v_original from public.contas_pagar_pessoais_pagamento_eventos e where e.id=p_evento_pagamento_id
  and e.empresa_id=p_empresa_id and e.proprietario_id=p_proprietario_id and e.tipo in ('Pagamento','Antecipacao');
 if not found or p_estornado_em<v_original.pago_em then raise exception 'Evento/data de estorno divergente'; end if;
 select * into v_estorno from public.contas_pagar_pessoais_pagamento_eventos e where e.empresa_id=p_empresa_id
  and e.proprietario_id=p_proprietario_id and e.idempotency_key=p_idempotency_key;
 if found then
  if v_estorno.tipo is distinct from 'Estorno' or v_estorno.estorno_de_evento_id is distinct from p_evento_pagamento_id
   or v_estorno.pago_em is distinct from p_estornado_em or v_estorno.observacoes is distinct from nullif(btrim(p_observacoes),'')
   or (select count(*) from public.despesas d where d.pagamento_evento_id=p_evento_pagamento_id
    and d.estorno_evento_id=v_estorno.id and d.estornada_em=v_estorno.pago_em and d.ativo is false)<>1 then
   raise exception 'Chave idempotente com estorno/despesa divergente'; end if;
  return v_estorno;
 end if;
 if v_conta.status is distinct from 'Pago' then raise exception 'A obrigação do evento não está Pago'; end if;
 if exists(select 1 from public.contas_pagar_pessoais_pagamento_eventos e where e.estorno_de_evento_id=p_evento_pagamento_id) then raise exception 'Evento original já possui estorno'; end if;
 insert into public.contas_pagar_pessoais_pagamento_eventos(empresa_id,proprietario_id,conta_pagar_pessoal_id,tipo,
  valor_nominal,valor_pago,desconto_obtido,pago_em,observacoes,idempotency_key,estorno_de_evento_id,autor_id)
 values(p_empresa_id,p_proprietario_id,v_original.conta_pagar_pessoal_id,'Estorno',v_original.valor_nominal,
  v_original.valor_pago,v_original.desconto_obtido,p_estornado_em,nullif(btrim(p_observacoes),''),
  p_idempotency_key,p_evento_pagamento_id,v_uid) returning * into v_estorno;
 update public.despesas set ativo=false,estornada_em=p_estornado_em,estorno_evento_id=v_estorno.id,updated_at=now()
 where pagamento_evento_id=p_evento_pagamento_id and empresa_id=p_empresa_id and proprietario_id=p_proprietario_id and ativo is true;
 if not found then raise exception 'Falha fail-closed ao estornar despesa vinculada'; end if;
 update public.contas_pagar_pessoais set status='Pendente' where id=v_conta.id and empresa_id=p_empresa_id and proprietario_id=p_proprietario_id;
 if not found then raise exception 'Falha fail-closed ao reabrir obrigação'; end if;
 return v_estorno;
end $rpc$;

create or replace function public.criar_parcelamento_conta_pessoal_com_entrada(
 p_empresa_id uuid,p_proprietario_id uuid,p_idempotency_key uuid,p_descricao text,p_fornecedor text,
 p_valor_total numeric,p_valor_entrada numeric,p_data_entrada date,p_quantidade integer,
 p_primeiro_vencimento date,p_periodicidade text,p_categoria text,p_observacoes text)
returns setof public.contas_pagar_pessoais language plpgsql security invoker set search_path=''
as $rpc$
declare v_header public.contas_pagar_pessoais_entradas%rowtype;
 v_evento public.contas_pagar_pessoais_pagamento_eventos%rowtype;
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
   or v_header.primeiro_vencimento is distinct from p_primeiro_vencimento or v_header.periodicidade is distinct from 'Mensal'
   or v_header.categoria is distinct from nullif(btrim(p_categoria),'') or v_header.observacoes is distinct from nullif(btrim(p_observacoes),'')
   or (select count(*) from public.contas_pagar_pessoais p where p.entrada_id=v_header.id)<>p_quantidade
   or (select sum(p.valor) from public.contas_pagar_pessoais p where p.entrada_id=v_header.id)<>v_saldo/100.0
   or (select count(*) from public.contas_pagar_pessoais_pagamento_eventos e where e.entrada_id=v_header.id and e.tipo='Entrada'
       and e.valor_nominal=v_header.valor_entrada and e.valor_pago=v_header.valor_entrada
       and e.desconto_obtido=0 and e.pago_em=v_header.data_entrada)<>1
   or (select count(*) from public.despesas d join public.contas_pagar_pessoais_pagamento_eventos e
       on e.id=d.pagamento_evento_id where e.entrada_id=v_header.id and d.empresa_id=p_empresa_id
       and d.proprietario_id=p_proprietario_id and d.origem_tipo='Entrada' and d.valor=v_header.valor_entrada
       and d.data_lancamento=v_header.data_entrada and d.ativo is true)<>1
  then raise exception 'Chave idempotente com conteúdo, lote, evento ou despesa divergente'; end if;
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
 insert into public.contas_pagar_pessoais_pagamento_eventos(empresa_id,proprietario_id,entrada_id,tipo,
  valor_nominal,valor_pago,desconto_obtido,pago_em,observacoes,idempotency_key,autor_id)
 values(p_empresa_id,p_proprietario_id,v_header.id,'Entrada',v_entrada/100.0,v_entrada/100.0,0,p_data_entrada,
  nullif(btrim(p_observacoes),''),p_idempotency_key,(select auth.uid())) returning * into v_evento;
 insert into public.despesas(tipo,categoria,descricao,valor,data_lancamento,empresa_id,proprietario_id,ativo,
  pagamento_evento_id,origem_tipo)
 values('despesa',coalesce(v_header.categoria,'Entrada de compra'),v_header.descricao,v_evento.valor_pago,
  v_evento.pago_em,p_empresa_id,p_proprietario_id,true,v_evento.id,'Entrada');
 return query select p.* from public.contas_pagar_pessoais p where p.entrada_id=v_header.id
  and p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id order by p.parcela_numero;
end $rpc$;

-- Não é chamada por esta migration. Sua execução futura exige autorização separada.
-- Materializa somente um evento Entrada já existente, uma única vez, usando o próprio
-- evento como chave física de idempotência.
create function public.materializar_despesa_evento_entrada_pessoal(
 p_evento_id uuid,p_empresa_id uuid,p_proprietario_id uuid)
returns public.despesas language plpgsql security invoker set search_path=''
as $rpc$
declare
 v_uid uuid:=(select auth.uid());
 v_evento public.contas_pagar_pessoais_pagamento_eventos%rowtype;
 v_entrada public.contas_pagar_pessoais_entradas%rowtype;
 v_despesa public.despesas%rowtype;
begin
 if v_uid is null or p_proprietario_id is distinct from v_uid then
  raise exception 'Sessão autenticada/proprietário inválido';
 end if;
 if p_evento_id is null or p_empresa_id is null
 or not exists(select 1 from public.usuarios u where u.id=v_uid and u.empresa_id=p_empresa_id) then
  raise exception 'Evento/tenant inválido para a sessão autenticada';
 end if;

 perform pg_advisory_xact_lock(hashtextextended(p_evento_id::text,0));
 select * into v_evento
 from public.contas_pagar_pessoais_pagamento_eventos e
 where e.id=p_evento_id and e.empresa_id=p_empresa_id
  and e.proprietario_id=p_proprietario_id and e.tipo='Entrada'
  and e.entrada_id is not null and e.conta_pagar_pessoal_id is null;
 if not found then raise exception 'Evento Entrada não encontrado no escopo autenticado'; end if;

 select * into v_entrada
 from public.contas_pagar_pessoais_entradas h
 where h.id=v_evento.entrada_id and h.empresa_id=p_empresa_id
  and h.proprietario_id=p_proprietario_id;
 if not found
 or v_evento.valor_nominal is distinct from v_entrada.valor_entrada
 or v_evento.valor_pago is distinct from v_entrada.valor_entrada
 or v_evento.desconto_obtido is distinct from 0
 or v_evento.pago_em is distinct from v_entrada.data_entrada then
  raise exception 'Evento Entrada diverge do cabeçalho financeiro';
 end if;

 select * into v_despesa from public.despesas d
 where d.pagamento_evento_id=v_evento.id;
 if found then
  if v_despesa.empresa_id is distinct from p_empresa_id
   or v_despesa.proprietario_id is distinct from p_proprietario_id
   or v_despesa.tipo is distinct from 'despesa'
   or v_despesa.origem_tipo is distinct from 'Entrada'
   or v_despesa.valor is distinct from v_evento.valor_pago
   or v_despesa.data_lancamento is distinct from v_evento.pago_em
   or v_despesa.ativo is distinct from true
   or v_despesa.estorno_evento_id is not null or v_despesa.estornada_em is not null then
    raise exception 'Evento já possui despesa divergente';
  end if;
  return v_despesa;
 end if;

 insert into public.despesas(tipo,categoria,descricao,valor,data_lancamento,empresa_id,
  proprietario_id,ativo,pagamento_evento_id,origem_tipo)
 values('despesa',coalesce(nullif(btrim(v_entrada.categoria),''),'Entrada de compra'),
  v_entrada.descricao,v_evento.valor_pago,v_evento.pago_em,p_empresa_id,
  p_proprietario_id,true,v_evento.id,'Entrada')
 returning * into v_despesa;
 return v_despesa;
end $rpc$;

revoke all on function public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid) from public,anon;
grant execute on function public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid) to authenticated;
revoke all on function public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid) from public,anon;
grant execute on function public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid) to authenticated;
revoke all on function public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text) from public,anon;
grant execute on function public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text) to authenticated;
revoke all on function public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid) from public,anon;
grant execute on function public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid) to authenticated;

do $postguards$
declare v_policies name[];
begin
 if (select count(*) from public.despesas)<>11
 or (select count(*) from public.despesas where tipo='receita')<>8
 or (select sum(valor) from public.despesas where tipo='receita')<>14396
 or (select count(*) from public.despesas where tipo='despesa')<>3
 or (select sum(valor) from public.despesas where tipo='despesa')<>1585.80
 or (select count(*) from public.despesas where proprietario_id is not null
   or pagamento_evento_id is not null or origem_tipo is not null
   or estorno_evento_id is not null or estornada_em is not null)<>0
 or (select md5(string_agg((to_jsonb(d)-'proprietario_id'-'pagamento_evento_id'-'origem_tipo'-
     'estorno_evento_id'-'estornada_em')::text,'|' order by id)) from public.despesas d)
    <>'fe48fb20456c0ed9bb3b9a70fc26e5ae' then
  raise exception 'ABORTADO: histórico de despesas mudou durante a migration';
 end if;
 if (select count(*) from public.contas_pagar_pessoais)<>43
 or (select count(*) from public.contas_pagar_pessoais where status='Pago')<>21
 or (select count(*) from public.contas_pagar_pessoais where status='Pendente')<>22
 or (select sum(valor) from public.contas_pagar_pessoais)<>41574.73
 or (select md5(string_agg(to_jsonb(p)::text,'|' order by id)) from public.contas_pagar_pessoais p)
    <>'66e1af3fb3bd3acdd7482f0b8f1335f8' then
  raise exception 'ABORTADO: obrigações foram alteradas durante a migration';
 end if;
 if (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)<>1
 or (select count(*) from public.contas_pagar_pessoais_entradas)<>1
 or (select count(*) from public.contas_pagar_pessoais_pagamento_eventos e
     where e.id='810ee061-bfcf-4377-aa0c-de13d164bd3b'::uuid
      and md5(to_jsonb(e)::text)='e8c42a74a4b25768ed5f9882e0d894de')<>1
 or (select count(*) from public.contas_pagar_pessoais_entradas h
     where h.id='c5bff023-2780-4f4b-9b48-a0a8f63d3f55'::uuid
      and md5(to_jsonb(h)::text)='22dd1f59b6c45c64754e5e890f5f5826')<>1 then
  raise exception 'ABORTADO: evento/cabeçalho da entrada mudou durante a migration';
 end if;
 if (select count(*) from public.despesas where pagamento_evento_id is not null)<>0 then
  raise exception 'ABORTADO: a migration materializou despesa sem autorização';
 end if;
 select array_agg(policyname order by policyname) into v_policies from pg_policies
 where schemaname='public' and tablename='despesas';
 if v_policies is distinct from array['despesas_delete_tenant','despesas_insert_tenant',
  'despesas_select_tenant','despesas_update_tenant']::name[]
 or not (select relrowsecurity from pg_class where oid='public.despesas'::regclass) then
  raise exception 'ABORTADO: RLS/policies finais divergiram';
 end if;
 if exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename='despesas'
   and (p.roles is distinct from array['authenticated']::name[] or p.permissive<>'PERMISSIVE'
    or (p.cmd in ('SELECT','UPDATE','DELETE') and (
      coalesce(p.qual,'') not like '%auth.uid()%'
      or coalesce(p.qual,'') not like '%empresa_id%'
      or coalesce(p.qual,'') not like '%proprietario_id%'))
    or (p.cmd in ('INSERT','UPDATE') and (
      coalesce(p.with_check,'') not like '%auth.uid()%'
      or coalesce(p.with_check,'') not like '%empresa_id%'
      or coalesce(p.with_check,'') not like '%proprietario_id%'))
    or (p.cmd='DELETE' and (coalesce(p.qual,'') not like '%pagamento_evento_id%IS NULL%'
      or coalesce(p.qual,'') not like '%proprietario_id%IS NULL%')))) then
  raise exception 'ABORTADO: isolamento final das policies de despesas divergiu';
 end if;
 if (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais_pagamento_eventos') x)
    <>'706125c655e0432559190e3d3c69d671'
 or (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by policyname),'')) from (
   select policyname,cmd,roles,permissive,qual,with_check from pg_policies
   where schemaname='public' and tablename='contas_pagar_pessoais_entradas') x)
    <>'5b039610b1c0def3c2926c45e1d58a4c' then
  raise exception 'ABORTADO: policies de eventos/entradas foram alteradas';
 end if;
 if to_regprocedure('public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)') is null
 or (select prosecdef from pg_proc where oid=
    'public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)'::regprocedure)
 or not (select proconfig @> array['search_path=""']::text[] from pg_proc where oid=
    'public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)'::regprocedure)
 or not has_function_privilege('authenticated',
    'public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)'::regprocedure,'EXECUTE')
 or has_function_privilege('anon',
    'public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)'::regprocedure,'EXECUTE')
 or exists(select 1 from pg_proc p where p.oid=
    'public.materializar_despesa_evento_entrada_pessoal(uuid,uuid,uuid)'::regprocedure
    and exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where a.grantee=0 and a.privilege_type='EXECUTE')) then
  raise exception 'ABORTADO: segurança/privilégios da RPC de materialização divergiram';
 end if;
end $postguards$;
commit;
