-- MIGRATION CONTROLADA FUTURA. NÃO EXECUTAR SEM NOVA AUTORIZAÇÃO.
begin;
do $guards$
declare v_security_fingerprint text;v_policies name[];
begin
 select md5(concat_ws('|',
  (select concat(c.relrowsecurity,':',c.relforcerowsecurity) from pg_class c where c.oid='public.contas_pagar_pessoais'::regclass),
  (select coalesce(string_agg(to_jsonb(x)::text,'|' order by x.policyname),'') from (
    select policyname,cmd,roles,permissive,qual,with_check from pg_policies
    where schemaname='public' and tablename='contas_pagar_pessoais') x),
  (select string_agg(concat(r,':',p,':',v),'|' order by r,p) from (
    select r,p,case when r='PUBLIC' then exists(
      select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      where a.grantee=0 and upper(a.privilege_type)=p)
     else has_table_privilege(r,'public.contas_pagar_pessoais',p) end v
    from unnest(array['authenticated','anon','PUBLIC']) r
    cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
    cross join lateral (select relacl,relowner from pg_class where oid='public.contas_pagar_pessoais'::regclass) c) q),
  (select coalesce(string_agg(concat(p.oid::regprocedure::text,':',p.prosecdef,':',coalesce(array_to_string(p.proconfig,','),''),':',
    has_function_privilege('authenticated',p.oid,'EXECUTE'),':',has_function_privilege('anon',p.oid,'EXECUTE'),':',
    exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE')),
    '|' order by p.oid::regprocedure::text),'')
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
    'criar_parcelamento_conta_pessoal','criar_parcelamento_conta_pessoal_com_entrada',
    'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal','atualizar_metadados_grupo_conta_pessoal'))
 )) into v_security_fingerprint;
 if v_security_fingerprint is distinct from '5cfe5d9826b9df1494e8750177e3056e'
 then raise exception 'ABORTADO: baseline RLS/policies/privilégios/RPCs mudou: %',v_security_fingerprint; end if;
 if not (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais'::regclass)
 or (select rolbypassrls from pg_roles where rolname='authenticated')
 or (select rolbypassrls from pg_roles where rolname='anon')
 then raise exception 'ABORTADO: RLS/bypass incompatível'; end if;
 select array_agg(policyname order by policyname) into v_policies from pg_policies
  where schemaname='public' and tablename='contas_pagar_pessoais';
 if v_policies is distinct from array[
  'contas_pagar_pessoais_delete_proprietario','contas_pagar_pessoais_insert_proprietario',
  'contas_pagar_pessoais_select_proprietario','contas_pagar_pessoais_update_proprietario']::name[]
 or exists(select 1 from pg_policies where schemaname='public' and tablename='contas_pagar_pessoais'
  and (permissive<>'PERMISSIVE' or roles<>array['authenticated']::name[]
   or coalesce(qual,with_check) not ilike '%auth.uid()%'
   or coalesce(qual,with_check) not ilike '%proprietario_id%'
   or coalesce(qual,with_check) not ilike '%empresa_id%'
   or coalesce(qual,with_check) not ilike '%usuarios%'
   or coalesce(btrim(qual),'') in ('true','(true)') or coalesce(btrim(with_check),'') in ('true','(true)')))
 then raise exception 'ABORTADO: policies não preservam auth.uid + tenant + proprietário'; end if;
 if not has_table_privilege('authenticated','public.contas_pagar_pessoais','SELECT,INSERT,UPDATE,DELETE')
 or has_table_privilege('authenticated','public.contas_pagar_pessoais','TRUNCATE,REFERENCES,TRIGGER')
 or has_table_privilege('anon','public.contas_pagar_pessoais','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
 or exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where c.oid='public.contas_pagar_pessoais'::regclass and a.grantee=0)
 then raise exception 'ABORTADO: privilégios da tabela são excessivos ou incompatíveis'; end if;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
   'criar_parcelamento_conta_pessoal','criar_parcelamento_conta_pessoal_com_entrada',
   'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal','atualizar_metadados_grupo_conta_pessoal'))<>5
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
   'criar_parcelamento_conta_pessoal','criar_parcelamento_conta_pessoal_com_entrada',
   'registrar_pagamento_conta_pessoal','estornar_pagamento_conta_pessoal','atualizar_metadados_grupo_conta_pessoal')
  and (p.prosecdef or not (p.proconfig @> array['search_path=""']::text[])
   or not has_function_privilege('authenticated',p.oid,'EXECUTE')
   or has_function_privilege('anon',p.oid,'EXECUTE')
   or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where a.grantee=0 and a.privilege_type='EXECUTE')))
 then raise exception 'ABORTADO: RPCs atuais divergiram de SECURITY INVOKER/menor privilégio'; end if;
 if (select count(*) from public.contas_pagar_pessoais)<>43
 or (select count(*) from public.contas_pagar_pessoais where status='Pago')<>21
 or (select count(*) from public.contas_pagar_pessoais where status='Pendente')<>22
 or (select count(*) from public.contas_pagar_pessoais where status='Cancelada')<>0
 or (select coalesce(sum(valor),0) from public.contas_pagar_pessoais)<>41574.73
 or (select count(*) from public.contas_pagar_pessoais where grupo_parcelamento_id is not null)<>24
 or (select count(*) from public.contas_pagar_pessoais_pagamento_eventos)<>0
 or (select count(*) from public.contas_fixas)<>8
 or (select count(*) from public.contas_fixas where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)<>6
 or (select coalesce(sum(valor),0) from public.contas_fixas where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)<>3608.53
 or (select array_agg(id order by id) from public.contas_fixas where empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid)
    is distinct from array[5,6,7,8,9,10]::bigint[]
 or (select count(*) from public.contas_fixas where id=10
  and empresa_id='8a85591b-2410-405f-8279-910dbcf61011'::uuid
  and descricao='financimento moto CB300' and valor=1308 and dia_vencimento=27
  and frequencia='Mensal' and ativo)<>1
 then raise exception 'ABORTADO: estado financeiro/fixas divergiu'; end if;
 if to_regclass('public.contas_pagar_pessoais_recorrencias') is not null
 or exists(select 1 from information_schema.columns where table_schema='public' and table_name='contas_pagar_pessoais'
  and column_name in ('recorrencia_id','competencia','valor_previsto'))
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  and p.proname in ('criar_recorrencia_conta_pessoal','materializar_competencia_conta_pessoal',
   'atualizar_recorrencia_conta_pessoal','ajustar_competencia_recorrente_pessoal',
   'cancelar_competencia_recorrente_pessoal','encerrar_recorrencia_conta_pessoal'))
 then raise exception 'ABORTADO: estrutura recorrente já existe total ou parcialmente'; end if;
end $guards$;

create table public.contas_pagar_pessoais_recorrencias(
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
 proprietario_id uuid not null references auth.users(id) on update cascade on delete restrict,
 source_conta_fixa_id bigint unique,
 descricao text not null check(length(btrim(descricao))>0),
 fornecedor text,
 valor_padrao numeric(14,2) not null check(valor_padrao>0),
 primeiro_vencimento date not null,
 quantidade_meses integer not null check(quantidade_meses between 1 and 120),
 periodicidade text not null default 'Mensal' check(periodicidade='Mensal'),
 categoria text,observacoes text,
 status text not null default 'Ativa' check(status in ('Ativa','Encerrada')),
 competencia_final date,
 versao integer not null default 1 check(versao>0),
 idempotency_key uuid not null,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 constraint cpp_recorrencias_scope_key unique(id,empresa_id,proprietario_id),
 constraint cpp_recorrencias_idempotency_key unique(empresa_id,proprietario_id,idempotency_key),
 constraint cpp_recorrencias_encerramento_check check(
  (status='Ativa' and competencia_final is null) or
  (status='Encerrada' and competencia_final is not null and extract(day from competencia_final)=1))
);

alter table public.contas_pagar_pessoais
 add column recorrencia_id uuid,
 add column competencia date,
 add column valor_previsto numeric(14,2),
 add constraint cpp_recorrencia_scope_fkey foreign key(recorrencia_id,empresa_id,proprietario_id)
  references public.contas_pagar_pessoais_recorrencias(id,empresa_id,proprietario_id) on update restrict on delete restrict,
 add constraint cpp_recorrencia_completa_check check(
  (recorrencia_id is null and competencia is null and valor_previsto is null)
  or (recorrencia_id is not null and competencia is not null and valor_previsto>0
      and extract(day from competencia)=1 and grupo_parcelamento_id is null and entrada_id is null));

create unique index cpp_recorrencia_competencia_key
 on public.contas_pagar_pessoais(empresa_id,proprietario_id,recorrencia_id,competencia)
 where recorrencia_id is not null;
create index cpp_recorrencia_mes_idx
 on public.contas_pagar_pessoais(proprietario_id,empresa_id,competencia,status)
 where recorrencia_id is not null;
create index cpp_recorrencias_owner_status_idx
 on public.contas_pagar_pessoais_recorrencias(proprietario_id,empresa_id,status);

alter table public.contas_pagar_pessoais_recorrencias enable row level security;
create policy cpp_recorrencias_select_owner on public.contas_pagar_pessoais_recorrencias
 for select to authenticated using(
  proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u
   where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_recorrencias.empresa_id));
create policy cpp_recorrencias_insert_owner on public.contas_pagar_pessoais_recorrencias
 for insert to authenticated with check(
  proprietario_id=(select auth.uid()) and source_conta_fixa_id is null and exists(select 1 from public.usuarios u
   where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_recorrencias.empresa_id));
create policy cpp_recorrencias_update_owner on public.contas_pagar_pessoais_recorrencias
 for update to authenticated using(
  proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u
   where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_recorrencias.empresa_id))
 with check(
  proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u
   where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_recorrencias.empresa_id));
revoke all on public.contas_pagar_pessoais_recorrencias from public,anon,authenticated;
grant select on public.contas_pagar_pessoais_recorrencias to authenticated;
grant insert(empresa_id,proprietario_id,descricao,fornecedor,valor_padrao,primeiro_vencimento,
 quantidade_meses,periodicidade,categoria,observacoes,idempotency_key)
 on public.contas_pagar_pessoais_recorrencias to authenticated;
grant update(descricao,fornecedor,valor_padrao,categoria,observacoes,status,competencia_final,versao,atualizado_em)
 on public.contas_pagar_pessoais_recorrencias to authenticated;

create function public.criar_recorrencia_conta_pessoal(
 p_empresa_id uuid,p_descricao text,p_fornecedor text,p_valor_padrao numeric,p_primeiro_vencimento date,
 p_quantidade_meses integer,p_periodicidade text,p_categoria text,p_observacoes text,p_idempotency_key uuid)
returns public.contas_pagar_pessoais_recorrencias language plpgsql security invoker set search_path='' as $fn$
declare r public.contas_pagar_pessoais_recorrencias;
begin
 if auth.uid() is null or p_empresa_id is null or nullif(btrim(p_descricao),'') is null or p_valor_padrao<=0
 or p_valor_padrao<>round(p_valor_padrao,2) or p_primeiro_vencimento is null
 or p_quantidade_meses not between 1 and 120 or p_periodicidade is distinct from 'Mensal'
 or p_idempotency_key is null then raise exception 'Parâmetros inválidos'; end if;
 if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id)
 then raise exception 'Usuário/tenant não autorizado'; end if;
 select * into r from public.contas_pagar_pessoais_recorrencias x where x.empresa_id=p_empresa_id
  and x.proprietario_id=auth.uid() and x.idempotency_key=p_idempotency_key;
 if found then
  if r.descricao<>btrim(p_descricao) or r.valor_padrao<>round(p_valor_padrao,2)
  or r.primeiro_vencimento<>p_primeiro_vencimento or r.quantidade_meses<>p_quantidade_meses
  then raise exception 'Idempotency key divergente'; end if; return r;
 end if;
 insert into public.contas_pagar_pessoais_recorrencias(empresa_id,proprietario_id,descricao,fornecedor,
  valor_padrao,primeiro_vencimento,quantidade_meses,periodicidade,categoria,observacoes,idempotency_key)
 values(p_empresa_id,auth.uid(),btrim(p_descricao),nullif(btrim(p_fornecedor),''),round(p_valor_padrao,2),
  p_primeiro_vencimento,p_quantidade_meses,'Mensal',nullif(btrim(p_categoria),''),
  nullif(btrim(p_observacoes),''),p_idempotency_key) returning * into r;return r;
end $fn$;

create function public.materializar_competencia_conta_pessoal(
 p_recorrencia_id uuid,p_empresa_id uuid,p_competencia date)
returns public.contas_pagar_pessoais language plpgsql security invoker set search_path='' as $fn$
declare s public.contas_pagar_pessoais_recorrencias;r public.contas_pagar_pessoais;
 v_inicio date;v_indice integer;v_ultimo date;v_vencimento date;
begin
 if auth.uid() is null or p_competencia is null or extract(day from p_competencia)<>1
 then raise exception 'Competência inválida'; end if;
 select * into s from public.contas_pagar_pessoais_recorrencias x where x.id=p_recorrencia_id
  and x.empresa_id=p_empresa_id and x.proprietario_id=auth.uid() for update;
 if not found then raise exception 'Série não encontrada ou não autorizada'; end if;
 if s.status<>'Ativa' then raise exception 'Série encerrada'; end if;
 v_inicio:=date_trunc('month',s.primeiro_vencimento)::date;
 v_indice:=(extract(year from age(p_competencia,v_inicio))*12+extract(month from age(p_competencia,v_inicio)))::integer;
 if v_indice<0 or v_indice>=s.quantidade_meses then raise exception 'Competência fora do período finito'; end if;
 select * into r from public.contas_pagar_pessoais p where p.empresa_id=p_empresa_id
  and p.proprietario_id=auth.uid() and p.recorrencia_id=p_recorrencia_id and p.competencia=p_competencia;
 if found then return r; end if;
 v_ultimo:=(p_competencia+interval '1 month - 1 day')::date;
 v_vencimento:=make_date(extract(year from p_competencia)::integer,extract(month from p_competencia)::integer,
  least(extract(day from s.primeiro_vencimento)::integer,extract(day from v_ultimo)::integer));
 insert into public.contas_pagar_pessoais(empresa_id,proprietario_id,descricao,fornecedor,valor,vencimento,
  status,categoria,observacoes,recorrencia_id,competencia,valor_previsto)
 values(s.empresa_id,s.proprietario_id,s.descricao,s.fornecedor,s.valor_padrao,v_vencimento,'Pendente',
  s.categoria,s.observacoes,s.id,p_competencia,s.valor_padrao) returning * into r;return r;
end $fn$;

create function public.atualizar_recorrencia_conta_pessoal(
 p_recorrencia_id uuid,p_empresa_id uuid,p_versao integer,p_descricao text,p_fornecedor text,
 p_valor_padrao numeric,p_categoria text,p_observacoes text)
returns public.contas_pagar_pessoais_recorrencias language plpgsql security invoker set search_path='' as $fn$
declare r public.contas_pagar_pessoais_recorrencias;
begin
 if auth.uid() is null or p_versao<1 or nullif(btrim(p_descricao),'') is null
 or p_valor_padrao<=0 or p_valor_padrao<>round(p_valor_padrao,2) then raise exception 'Parâmetros inválidos'; end if;
 select * into r from public.contas_pagar_pessoais_recorrencias x where x.id=p_recorrencia_id
  and x.empresa_id=p_empresa_id and x.proprietario_id=auth.uid() for update;
 if not found then raise exception 'Série não encontrada ou não autorizada'; end if;
 if r.status<>'Ativa' then raise exception 'Série encerrada'; end if;
 if r.versao<>p_versao then raise exception 'Conflito de versão'; end if;
 update public.contas_pagar_pessoais_recorrencias set descricao=btrim(p_descricao),
  fornecedor=nullif(btrim(p_fornecedor),''),valor_padrao=round(p_valor_padrao,2),
  categoria=nullif(btrim(p_categoria),''),observacoes=nullif(btrim(p_observacoes),''),
  versao=versao+1,atualizado_em=now() where id=p_recorrencia_id returning * into r;return r;
end $fn$;

create function public.ajustar_competencia_recorrente_pessoal(
 p_conta_id uuid,p_empresa_id uuid,p_valor_real numeric,p_vencimento date,p_observacoes text)
returns public.contas_pagar_pessoais language plpgsql security invoker set search_path='' as $fn$
declare r public.contas_pagar_pessoais;
begin
 if auth.uid() is null or p_valor_real<=0 or p_valor_real<>round(p_valor_real,2) or p_vencimento is null
 then raise exception 'Parâmetros inválidos'; end if;
 select * into r from public.contas_pagar_pessoais p where p.id=p_conta_id and p.empresa_id=p_empresa_id
  and p.proprietario_id=auth.uid() and p.recorrencia_id is not null for update;
 if not found then raise exception 'Competência não encontrada ou não autorizada'; end if;
 if r.status<>'Pendente' then raise exception 'Somente competência Pendente pode ser ajustada'; end if;
 if date_trunc('month',p_vencimento)::date<>r.competencia then raise exception 'Vencimento deve permanecer na competência'; end if;
 update public.contas_pagar_pessoais set valor=round(p_valor_real,2),vencimento=p_vencimento,
  observacoes=nullif(btrim(p_observacoes),'') where id=p_conta_id returning * into r;return r;
end $fn$;

create function public.cancelar_competencia_recorrente_pessoal(p_conta_id uuid,p_empresa_id uuid)
returns public.contas_pagar_pessoais language plpgsql security invoker set search_path='' as $fn$
declare r public.contas_pagar_pessoais;
begin
 select * into r from public.contas_pagar_pessoais p where p.id=p_conta_id and p.empresa_id=p_empresa_id
  and p.proprietario_id=auth.uid() and p.recorrencia_id is not null for update;
 if not found then raise exception 'Competência não encontrada ou não autorizada'; end if;
 if r.status<>'Pendente' then raise exception 'Somente competência Pendente pode ser cancelada'; end if;
 update public.contas_pagar_pessoais set status='Cancelada' where id=p_conta_id returning * into r;return r;
end $fn$;

create function public.encerrar_recorrencia_conta_pessoal(
 p_recorrencia_id uuid,p_empresa_id uuid,p_versao integer,p_competencia_final date)
returns public.contas_pagar_pessoais_recorrencias language plpgsql security invoker set search_path='' as $fn$
declare r public.contas_pagar_pessoais_recorrencias;v_max date;
begin
 if auth.uid() is null or p_versao<1 or p_competencia_final is null or extract(day from p_competencia_final)<>1
 then raise exception 'Parâmetros inválidos'; end if;
 select * into r from public.contas_pagar_pessoais_recorrencias x where x.id=p_recorrencia_id
  and x.empresa_id=p_empresa_id and x.proprietario_id=auth.uid() for update;
 if not found then raise exception 'Série não encontrada ou não autorizada'; end if;
 if r.status<>'Ativa' or r.versao<>p_versao then raise exception 'Estado/versão divergente'; end if;
 if p_competencia_final<date_trunc('month',r.primeiro_vencimento)::date
 or p_competencia_final>date_trunc('month',r.primeiro_vencimento)::date+(r.quantidade_meses-1)*interval '1 month'
 then raise exception 'Competência final fora do período da série'; end if;
 select max(competencia) into v_max from public.contas_pagar_pessoais p where p.recorrencia_id=p_recorrencia_id;
 if v_max is not null and p_competencia_final<v_max then
  raise exception 'Cancele individualmente competências posteriores antes de encerrar'; end if;
 update public.contas_pagar_pessoais_recorrencias set status='Encerrada',
  competencia_final=p_competencia_final,versao=versao+1,atualizado_em=now()
 where id=p_recorrencia_id returning * into r;return r;
end $fn$;

revoke execute on function public.criar_recorrencia_conta_pessoal(uuid,text,text,numeric,date,integer,text,text,text,uuid) from public,anon;
revoke execute on function public.materializar_competencia_conta_pessoal(uuid,uuid,date) from public,anon;
revoke execute on function public.atualizar_recorrencia_conta_pessoal(uuid,uuid,integer,text,text,numeric,text,text) from public,anon;
revoke execute on function public.ajustar_competencia_recorrente_pessoal(uuid,uuid,numeric,date,text) from public,anon;
revoke execute on function public.cancelar_competencia_recorrente_pessoal(uuid,uuid) from public,anon;
revoke execute on function public.encerrar_recorrencia_conta_pessoal(uuid,uuid,integer,date) from public,anon;
grant execute on function public.criar_recorrencia_conta_pessoal(uuid,text,text,numeric,date,integer,text,text,text,uuid) to authenticated;
grant execute on function public.materializar_competencia_conta_pessoal(uuid,uuid,date) to authenticated;
grant execute on function public.atualizar_recorrencia_conta_pessoal(uuid,uuid,integer,text,text,numeric,text,text) to authenticated;
grant execute on function public.ajustar_competencia_recorrente_pessoal(uuid,uuid,numeric,date,text) to authenticated;
grant execute on function public.cancelar_competencia_recorrente_pessoal(uuid,uuid) to authenticated;
grant execute on function public.encerrar_recorrencia_conta_pessoal(uuid,uuid,integer,date) to authenticated;

do $postguards$
declare v_new_policies name[];
begin
 select array_agg(policyname order by policyname) into v_new_policies from pg_policies
 where schemaname='public' and tablename='contas_pagar_pessoais_recorrencias';
 if not (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais_recorrencias'::regclass)
 or v_new_policies is distinct from array[
  'cpp_recorrencias_insert_owner','cpp_recorrencias_select_owner','cpp_recorrencias_update_owner']::name[]
 or exists(select 1 from pg_policies where schemaname='public' and tablename='contas_pagar_pessoais_recorrencias'
  and (permissive<>'PERMISSIVE' or roles<>array['authenticated']::name[]
   or coalesce(qual,with_check) not ilike '%auth.uid()%'
   or coalesce(qual,with_check) not ilike '%proprietario_id%'
   or coalesce(qual,with_check) not ilike '%empresa_id%'
   or coalesce(qual,with_check) not ilike '%usuarios%'
   or coalesce(btrim(qual),'') in ('true','(true)') or coalesce(btrim(with_check),'') in ('true','(true)')))
 then raise exception 'ABORTADO: RLS/policies da recorrência não preservam isolamento'; end if;
 if has_table_privilege('anon','public.contas_pagar_pessoais_recorrencias','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
 or has_table_privilege('authenticated','public.contas_pagar_pessoais_recorrencias','DELETE,TRUNCATE,REFERENCES,TRIGGER')
 or exists(select 1 from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  where c.oid='public.contas_pagar_pessoais_recorrencias'::regclass and a.grantee=0)
 then raise exception 'ABORTADO: anon/PUBLIC ou privilégio administrativo alcançou a nova tabela'; end if;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
   and p.proname in ('criar_recorrencia_conta_pessoal','materializar_competencia_conta_pessoal',
    'atualizar_recorrencia_conta_pessoal','ajustar_competencia_recorrente_pessoal',
    'cancelar_competencia_recorrente_pessoal','encerrar_recorrencia_conta_pessoal'))<>6
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
   and p.proname in ('criar_recorrencia_conta_pessoal','materializar_competencia_conta_pessoal',
    'atualizar_recorrencia_conta_pessoal','ajustar_competencia_recorrente_pessoal',
    'cancelar_competencia_recorrente_pessoal','encerrar_recorrencia_conta_pessoal')
   and (p.prosecdef or not (p.proconfig @> array['search_path=""']::text[])
    or not has_function_privilege('authenticated',p.oid,'EXECUTE')
    or has_function_privilege('anon',p.oid,'EXECUTE')
    or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
     where a.grantee=0 and a.privilege_type='EXECUTE')))
 then raise exception 'ABORTADO: privilégios das novas RPCs divergiram'; end if;
 if not (select relrowsecurity from pg_class where oid='public.contas_pagar_pessoais'::regclass)
 or (select array_agg(policyname order by policyname) from pg_policies
  where schemaname='public' and tablename='contas_pagar_pessoais') is distinct from array[
   'contas_pagar_pessoais_delete_proprietario','contas_pagar_pessoais_insert_proprietario',
   'contas_pagar_pessoais_select_proprietario','contas_pagar_pessoais_update_proprietario']::name[]
 then raise exception 'ABORTADO: tabela física perdeu o isolamento original'; end if;
end $postguards$;
commit;
