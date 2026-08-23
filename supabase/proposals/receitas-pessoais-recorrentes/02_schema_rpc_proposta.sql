-- MIGRATION CONTROLADA FUTURA. NÃO EXECUTAR SEM NOVA AUTORIZAÇÃO.
-- Cria somente receitas recorrentes; public.despesas é auditada, nunca escrita.
begin;

do $guards$
declare v_policies name[];
begin
  if (select count(*) from public.despesas) <> 11
     or (select count(*) from public.despesas where tipo = 'receita') <> 8
     or (select coalesce(sum(valor),0) from public.despesas where tipo = 'receita') <> 14396
     or (select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.despesas d) <> 'fe48fb20456c0ed9bb3b9a70fc26e5ae'
     or (select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.despesas d where tipo='receita') <> '4bf9a5ab8acf5c294ffeda87ebf26eb5'
  then raise exception 'ABORTADO: histórico de public.despesas divergiu'; end if;
  select array_agg(policyname order by policyname) into v_policies from pg_policies
   where schemaname='public' and tablename='despesas';
  if v_policies is distinct from array['despesas_delete_tenant','despesas_insert_tenant','despesas_select_tenant','despesas_update_tenant']::name[]
  then raise exception 'ABORTADO: policies de despesas divergiram: %',v_policies; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='usuarios' and column_name='id' and data_type='uuid')
     or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='usuarios' and column_name='empresa_id' and data_type='uuid')
  then raise exception 'ABORTADO: identidade usuarios.id/empresa_id incompatível'; end if;
  if to_regclass('public.receitas_pessoais_recorrencias') is not null
     or to_regclass('public.receitas_pessoais_competencias') is not null
     or to_regclass('public.receitas_pessoais_competencia_eventos') is not null
     or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
       ('criar_receita_recorrente_pessoal','atualizar_receita_recorrente_pessoal','materializar_competencia_receita_pessoal',
        'editar_competencia_receita_pessoal','registrar_recebimento_receita_pessoal','cancelar_competencia_receita_pessoal','reabrir_competencia_receita_pessoal'))
  then raise exception 'ABORTADO: estrutura recorrente já existe total ou parcialmente'; end if;
end $guards$;

create table public.receitas_pessoais_recorrencias(
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
 proprietario_id uuid not null references auth.users(id) on update cascade on delete restrict,
 descricao text not null check(length(btrim(descricao))>0), valor_padrao numeric(14,2) not null check(valor_padrao>0),
 categoria text, dia_previsto integer not null check(dia_previsto between 1 and 31),
 frequencia text not null default 'Mensal' check(frequencia='Mensal'), data_inicio date not null, data_fim date,
 observacoes text, ativo boolean not null default true, versao integer not null default 1 check(versao>0),
 idempotency_key uuid not null, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
 constraint receitas_recorrencias_periodo_check check(data_fim is null or data_fim>=data_inicio),
 constraint receitas_recorrencias_scope_key unique(id,empresa_id,proprietario_id),
 constraint receitas_recorrencias_idempotency_key unique(empresa_id,proprietario_id,idempotency_key)
);
create table public.receitas_pessoais_competencias(
 id uuid primary key default gen_random_uuid(), recorrencia_id uuid not null, empresa_id uuid not null, proprietario_id uuid not null,
 competencia date not null check(extract(day from competencia)=1), previsto_em date not null,
 valor_previsto numeric(14,2) not null check(valor_previsto>0), valor_recebido numeric(14,2), recebido_em date,
 status text not null default 'Prevista' check(status in ('Prevista','Recebida','Cancelada')), observacoes text,
 versao integer not null default 1 check(versao>0), idempotency_key uuid not null,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
 constraint receitas_competencias_recorrencia_fkey foreign key(recorrencia_id,empresa_id,proprietario_id)
  references public.receitas_pessoais_recorrencias(id,empresa_id,proprietario_id) on update restrict on delete restrict,
 constraint receitas_competencias_status_check check(
  (status='Prevista' and valor_recebido is null and recebido_em is null) or
  (status='Recebida' and valor_recebido>0 and recebido_em is not null) or
  (status='Cancelada' and valor_recebido is null and recebido_em is null)),
 constraint receitas_competencias_mes_key unique(recorrencia_id,competencia),
 constraint receitas_competencias_scope_key unique(id,empresa_id,proprietario_id),
 constraint receitas_competencias_idempotency_key unique(empresa_id,proprietario_id,idempotency_key)
);
create table public.receitas_pessoais_competencia_eventos(
 id uuid primary key default gen_random_uuid(), competencia_id uuid not null, empresa_id uuid not null, proprietario_id uuid not null,
 tipo text not null check(tipo in ('Recebimento','Cancelamento','Reabertura')), valor_recebido numeric(14,2),
 ocorrido_em date not null, observacoes text, idempotency_key uuid not null,
 autor_id uuid not null references auth.users(id) on update cascade on delete restrict, criado_em timestamptz not null default now(),
 constraint receitas_comp_eventos_competencia_fkey foreign key(competencia_id,empresa_id,proprietario_id)
  references public.receitas_pessoais_competencias(id,empresa_id,proprietario_id) on update restrict on delete restrict,
 constraint receitas_comp_eventos_tipo_check check((tipo='Recebimento' and valor_recebido>0) or (tipo in ('Cancelamento','Reabertura') and valor_recebido is null)),
 constraint receitas_comp_eventos_idempotency_key unique(empresa_id,proprietario_id,idempotency_key)
);
create index receitas_recorrencias_tenant_owner_idx on public.receitas_pessoais_recorrencias(empresa_id,proprietario_id,ativo);
create index receitas_competencias_tenant_owner_mes_idx on public.receitas_pessoais_competencias(empresa_id,proprietario_id,competencia,status);
create index receitas_comp_eventos_competencia_idx on public.receitas_pessoais_competencia_eventos(competencia_id,criado_em);
create index receitas_comp_eventos_tenant_owner_idx on public.receitas_pessoais_competencia_eventos(empresa_id,proprietario_id,criado_em);

alter table public.receitas_pessoais_recorrencias enable row level security;
alter table public.receitas_pessoais_competencias enable row level security;
alter table public.receitas_pessoais_competencia_eventos enable row level security;

create policy receitas_recorrencias_select_owner on public.receitas_pessoais_recorrencias for select to authenticated using
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_recorrencias.empresa_id));
create policy receitas_recorrencias_insert_owner on public.receitas_pessoais_recorrencias for insert to authenticated with check
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_recorrencias.empresa_id));
create policy receitas_recorrencias_update_owner on public.receitas_pessoais_recorrencias for update to authenticated using
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_recorrencias.empresa_id)) with check
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_recorrencias.empresa_id));
create policy receitas_competencias_select_owner on public.receitas_pessoais_competencias for select to authenticated using
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_competencias.empresa_id));
create policy receitas_competencias_insert_owner on public.receitas_pessoais_competencias for insert to authenticated with check
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_competencias.empresa_id));
create policy receitas_competencias_update_owner on public.receitas_pessoais_competencias for update to authenticated using
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_competencias.empresa_id)) with check
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_competencias.empresa_id));
create policy receitas_comp_eventos_select_owner on public.receitas_pessoais_competencia_eventos for select to authenticated using
 (proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_competencia_eventos.empresa_id));
create policy receitas_comp_eventos_insert_owner on public.receitas_pessoais_competencia_eventos for insert to authenticated with check
 (proprietario_id=(select auth.uid()) and autor_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=receitas_pessoais_competencia_eventos.empresa_id));

revoke all on public.receitas_pessoais_recorrencias from public,anon,authenticated;
revoke all on public.receitas_pessoais_competencias from public,anon,authenticated;
revoke all on public.receitas_pessoais_competencia_eventos from public,anon,authenticated;
grant select,insert,update on public.receitas_pessoais_recorrencias to authenticated;
grant select,insert,update on public.receitas_pessoais_competencias to authenticated;
grant select,insert on public.receitas_pessoais_competencia_eventos to authenticated;

create function public.criar_receita_recorrente_pessoal(p_empresa_id uuid,p_descricao text,p_valor_padrao numeric,p_categoria text,p_dia_previsto integer,p_data_inicio date,p_data_fim date,p_observacoes text,p_idempotency_key uuid)
returns public.receitas_pessoais_recorrencias language plpgsql security invoker set search_path='' as $fn$
declare r public.receitas_pessoais_recorrencias;
begin
 if auth.uid() is null or p_empresa_id is null or p_idempotency_key is null or length(btrim(coalesce(p_descricao,'')))=0
    or p_valor_padrao<=0 or p_dia_previsto not between 1 and 31 or p_data_inicio is null or (p_data_fim is not null and p_data_fim<p_data_inicio)
 then raise exception 'Parâmetros inválidos'; end if;
 if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Usuário/tenant não autorizado'; end if;
 select * into r from public.receitas_pessoais_recorrencias where empresa_id=p_empresa_id and proprietario_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then
  if r.descricao<>btrim(p_descricao) or r.valor_padrao<>p_valor_padrao or r.dia_previsto<>p_dia_previsto or r.data_inicio<>p_data_inicio or r.data_fim is distinct from p_data_fim
  then raise exception 'Idempotency key reutilizada com conteúdo divergente'; end if; return r;
 end if;
 insert into public.receitas_pessoais_recorrencias(empresa_id,proprietario_id,descricao,valor_padrao,categoria,dia_previsto,data_inicio,data_fim,observacoes,idempotency_key)
 values(p_empresa_id,auth.uid(),btrim(p_descricao),p_valor_padrao,nullif(btrim(p_categoria),''),p_dia_previsto,p_data_inicio,p_data_fim,p_observacoes,p_idempotency_key) returning * into r;
 return r;
end $fn$;

create function public.atualizar_receita_recorrente_pessoal(p_recorrencia_id uuid,p_empresa_id uuid,p_versao_esperada integer,p_descricao text,p_valor_padrao numeric,p_categoria text,p_dia_previsto integer,p_data_inicio date,p_data_fim date,p_observacoes text,p_ativo boolean)
returns public.receitas_pessoais_recorrencias language plpgsql security invoker set search_path='' as $fn$
declare r public.receitas_pessoais_recorrencias; v_min date; v_max date;
begin
 if auth.uid() is null or p_versao_esperada<1 or length(btrim(coalesce(p_descricao,'')))=0 or p_valor_padrao<=0 or p_dia_previsto not between 1 and 31 or p_data_inicio is null or p_ativo is null or (p_data_fim is not null and p_data_fim<p_data_inicio) then raise exception 'Parâmetros inválidos'; end if;
 select * into r from public.receitas_pessoais_recorrencias where id=p_recorrencia_id and empresa_id=p_empresa_id and proprietario_id=auth.uid() for update;
 if not found then raise exception 'Série não encontrada ou não autorizada'; end if; if r.versao<>p_versao_esperada then raise exception 'Conflito de versão'; end if;
 select min(competencia),max(competencia) into v_min,v_max from public.receitas_pessoais_competencias where recorrencia_id=p_recorrencia_id;
 if v_min is not null and date_trunc('month',p_data_inicio)::date>v_min then raise exception 'Data inicial excluiria competência materializada'; end if;
 if v_max is not null and p_data_fim is not null and date_trunc('month',p_data_fim)::date<v_max then raise exception 'Data final excluiria competência materializada'; end if;
 update public.receitas_pessoais_recorrencias set descricao=btrim(p_descricao),valor_padrao=p_valor_padrao,categoria=nullif(btrim(p_categoria),''),dia_previsto=p_dia_previsto,data_inicio=p_data_inicio,data_fim=p_data_fim,observacoes=p_observacoes,ativo=p_ativo,versao=versao+1,atualizado_em=now() where id=p_recorrencia_id returning * into r;
 return r;
end $fn$;

create function public.materializar_competencia_receita_pessoal(p_recorrencia_id uuid,p_empresa_id uuid,p_competencia date,p_idempotency_key uuid)
returns public.receitas_pessoais_competencias language plpgsql security invoker set search_path='' as $fn$
declare s public.receitas_pessoais_recorrencias; r public.receitas_pessoais_competencias; v_ultimo date; v_previsto date;
begin
 if auth.uid() is null or p_competencia is null or p_idempotency_key is null or extract(day from p_competencia)<>1 then raise exception 'Competência inválida'; end if;
 select * into s from public.receitas_pessoais_recorrencias where id=p_recorrencia_id and empresa_id=p_empresa_id and proprietario_id=auth.uid() for update;
 if not found then raise exception 'Série não encontrada ou não autorizada'; end if; if not s.ativo then raise exception 'Série inativa'; end if;
 if p_competencia<date_trunc('month',s.data_inicio)::date or (s.data_fim is not null and p_competencia>date_trunc('month',s.data_fim)::date) then raise exception 'Competência fora do período'; end if;
 select * into r from public.receitas_pessoais_competencias where empresa_id=p_empresa_id and proprietario_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then if r.recorrencia_id<>p_recorrencia_id or r.competencia<>p_competencia then raise exception 'Idempotency key divergente'; end if; return r; end if;
 select * into r from public.receitas_pessoais_competencias where recorrencia_id=p_recorrencia_id and competencia=p_competencia; if found then return r; end if;
 v_ultimo:=(p_competencia+interval '1 month - 1 day')::date;
 v_previsto:=make_date(extract(year from p_competencia)::integer,extract(month from p_competencia)::integer,least(s.dia_previsto,extract(day from v_ultimo)::integer));
 insert into public.receitas_pessoais_competencias(recorrencia_id,empresa_id,proprietario_id,competencia,previsto_em,valor_previsto,observacoes,idempotency_key)
 values(s.id,s.empresa_id,s.proprietario_id,p_competencia,v_previsto,s.valor_padrao,s.observacoes,p_idempotency_key) returning * into r; return r;
end $fn$;

create function public.editar_competencia_receita_pessoal(p_competencia_id uuid,p_empresa_id uuid,p_versao_esperada integer,p_previsto_em date,p_valor_previsto numeric,p_observacoes text)
returns public.receitas_pessoais_competencias language plpgsql security invoker set search_path='' as $fn$
declare r public.receitas_pessoais_competencias;
begin
 if auth.uid() is null or p_versao_esperada<1 or p_previsto_em is null or p_valor_previsto<=0 then raise exception 'Parâmetros inválidos'; end if;
 select * into r from public.receitas_pessoais_competencias where id=p_competencia_id and empresa_id=p_empresa_id and proprietario_id=auth.uid() for update;
 if not found then raise exception 'Competência não encontrada ou não autorizada'; end if; if r.status<>'Prevista' then raise exception 'Somente Prevista pode ser editada'; end if; if r.versao<>p_versao_esperada then raise exception 'Conflito de versão'; end if;
 if date_trunc('month',p_previsto_em)::date<>r.competencia then raise exception 'Data deve permanecer na competência'; end if;
 update public.receitas_pessoais_competencias set previsto_em=p_previsto_em,valor_previsto=p_valor_previsto,observacoes=p_observacoes,versao=versao+1,atualizado_em=now() where id=p_competencia_id returning * into r; return r;
end $fn$;

create function public.registrar_recebimento_receita_pessoal(p_competencia_id uuid,p_empresa_id uuid,p_valor_recebido numeric,p_recebido_em date,p_observacoes text,p_idempotency_key uuid)
returns public.receitas_pessoais_competencias language plpgsql security invoker set search_path='' as $fn$
declare r public.receitas_pessoais_competencias; e public.receitas_pessoais_competencia_eventos;
begin
 if auth.uid() is null or p_valor_recebido<=0 or p_recebido_em is null or p_idempotency_key is null then raise exception 'Parâmetros inválidos'; end if;
 select * into r from public.receitas_pessoais_competencias where id=p_competencia_id and empresa_id=p_empresa_id and proprietario_id=auth.uid() for update; if not found then raise exception 'Competência não encontrada ou não autorizada'; end if;
 select * into e from public.receitas_pessoais_competencia_eventos where empresa_id=p_empresa_id and proprietario_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then if e.competencia_id<>p_competencia_id or e.tipo<>'Recebimento' or e.valor_recebido<>p_valor_recebido or e.ocorrido_em<>p_recebido_em then raise exception 'Idempotency key divergente'; end if; return r; end if;
 if r.status<>'Prevista' then raise exception 'Competência não está Prevista'; end if;
 insert into public.receitas_pessoais_competencia_eventos(competencia_id,empresa_id,proprietario_id,tipo,valor_recebido,ocorrido_em,observacoes,idempotency_key,autor_id) values(r.id,r.empresa_id,r.proprietario_id,'Recebimento',p_valor_recebido,p_recebido_em,p_observacoes,p_idempotency_key,auth.uid());
 update public.receitas_pessoais_competencias set status='Recebida',valor_recebido=p_valor_recebido,recebido_em=p_recebido_em,versao=versao+1,atualizado_em=now() where id=p_competencia_id returning * into r; return r;
end $fn$;

create function public.cancelar_competencia_receita_pessoal(p_competencia_id uuid,p_empresa_id uuid,p_ocorrido_em date,p_observacoes text,p_idempotency_key uuid)
returns public.receitas_pessoais_competencias language plpgsql security invoker set search_path='' as $fn$
declare r public.receitas_pessoais_competencias; e public.receitas_pessoais_competencia_eventos;
begin
 if auth.uid() is null or p_ocorrido_em is null or p_idempotency_key is null then raise exception 'Parâmetros inválidos'; end if;
 select * into r from public.receitas_pessoais_competencias where id=p_competencia_id and empresa_id=p_empresa_id and proprietario_id=auth.uid() for update; if not found then raise exception 'Competência não encontrada ou não autorizada'; end if;
 select * into e from public.receitas_pessoais_competencia_eventos where empresa_id=p_empresa_id and proprietario_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then if e.competencia_id<>p_competencia_id or e.tipo<>'Cancelamento' or e.ocorrido_em<>p_ocorrido_em then raise exception 'Idempotency key divergente'; end if; return r; end if;
 if r.status<>'Prevista' then raise exception 'Somente Prevista pode ser cancelada'; end if;
 insert into public.receitas_pessoais_competencia_eventos(competencia_id,empresa_id,proprietario_id,tipo,ocorrido_em,observacoes,idempotency_key,autor_id) values(r.id,r.empresa_id,r.proprietario_id,'Cancelamento',p_ocorrido_em,p_observacoes,p_idempotency_key,auth.uid());
 update public.receitas_pessoais_competencias set status='Cancelada',valor_recebido=null,recebido_em=null,versao=versao+1,atualizado_em=now() where id=p_competencia_id returning * into r; return r;
end $fn$;

create function public.reabrir_competencia_receita_pessoal(p_competencia_id uuid,p_empresa_id uuid,p_ocorrido_em date,p_observacoes text,p_idempotency_key uuid)
returns public.receitas_pessoais_competencias language plpgsql security invoker set search_path='' as $fn$
declare r public.receitas_pessoais_competencias; e public.receitas_pessoais_competencia_eventos;
begin
 if auth.uid() is null or p_ocorrido_em is null or p_idempotency_key is null then raise exception 'Parâmetros inválidos'; end if;
 select * into r from public.receitas_pessoais_competencias where id=p_competencia_id and empresa_id=p_empresa_id and proprietario_id=auth.uid() for update; if not found then raise exception 'Competência não encontrada ou não autorizada'; end if;
 select * into e from public.receitas_pessoais_competencia_eventos where empresa_id=p_empresa_id and proprietario_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then if e.competencia_id<>p_competencia_id or e.tipo<>'Reabertura' or e.ocorrido_em<>p_ocorrido_em then raise exception 'Idempotency key divergente'; end if; return r; end if;
 if r.status<>'Cancelada' then raise exception 'Somente Cancelada pode ser reaberta'; end if;
 insert into public.receitas_pessoais_competencia_eventos(competencia_id,empresa_id,proprietario_id,tipo,ocorrido_em,observacoes,idempotency_key,autor_id) values(r.id,r.empresa_id,r.proprietario_id,'Reabertura',p_ocorrido_em,p_observacoes,p_idempotency_key,auth.uid());
 update public.receitas_pessoais_competencias set status='Prevista',valor_recebido=null,recebido_em=null,versao=versao+1,atualizado_em=now() where id=p_competencia_id returning * into r; return r;
end $fn$;

revoke execute on function public.criar_receita_recorrente_pessoal(uuid,text,numeric,text,integer,date,date,text,uuid) from public,anon;
revoke execute on function public.atualizar_receita_recorrente_pessoal(uuid,uuid,integer,text,numeric,text,integer,date,date,text,boolean) from public,anon;
revoke execute on function public.materializar_competencia_receita_pessoal(uuid,uuid,date,uuid) from public,anon;
revoke execute on function public.editar_competencia_receita_pessoal(uuid,uuid,integer,date,numeric,text) from public,anon;
revoke execute on function public.registrar_recebimento_receita_pessoal(uuid,uuid,numeric,date,text,uuid) from public,anon;
revoke execute on function public.cancelar_competencia_receita_pessoal(uuid,uuid,date,text,uuid) from public,anon;
revoke execute on function public.reabrir_competencia_receita_pessoal(uuid,uuid,date,text,uuid) from public,anon;
grant execute on function public.criar_receita_recorrente_pessoal(uuid,text,numeric,text,integer,date,date,text,uuid) to authenticated;
grant execute on function public.atualizar_receita_recorrente_pessoal(uuid,uuid,integer,text,numeric,text,integer,date,date,text,boolean) to authenticated;
grant execute on function public.materializar_competencia_receita_pessoal(uuid,uuid,date,uuid) to authenticated;
grant execute on function public.editar_competencia_receita_pessoal(uuid,uuid,integer,date,numeric,text) to authenticated;
grant execute on function public.registrar_recebimento_receita_pessoal(uuid,uuid,numeric,date,text,uuid) to authenticated;
grant execute on function public.cancelar_competencia_receita_pessoal(uuid,uuid,date,text,uuid) to authenticated;
grant execute on function public.reabrir_competencia_receita_pessoal(uuid,uuid,date,text,uuid) to authenticated;

commit;
