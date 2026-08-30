-- Corrige somente os seis críticos auditados do Financeiro Pessoal.
-- A migration é aditiva, preserva histórico e aborta se ownership legado for ambíguo.

alter table public.despesas add column if not exists proprietario_id uuid references auth.users(id) on update cascade on delete restrict;
alter table public.contas_fixas add column if not exists proprietario_id uuid references auth.users(id) on update cascade on delete restrict;
alter table public.contas_fixas add column if not exists data_base date;
alter table public.despesas add column if not exists ativo boolean not null default true;
alter table public.despesas add column if not exists pagamento_evento_id uuid;
alter table public.despesas add column if not exists origem_tipo text;
alter table public.despesas add column if not exists estorno_evento_id uuid;
alter table public.despesas add column if not exists estornada_em date;
alter table public.contas_pagar_pessoais add column if not exists grupo_parcelamento_id uuid;
alter table public.contas_pagar_pessoais add column if not exists parcela_numero integer;
alter table public.contas_pagar_pessoais add column if not exists parcelas_total integer;
alter table public.contas_pagar_pessoais add column if not exists valor_total_compra numeric(14,2);
alter table public.contas_pagar_pessoais add column if not exists periodicidade text;
alter table public.contas_pagar_pessoais add column if not exists idempotency_key uuid;
alter table public.contas_pagar_pessoais add column if not exists entrada_id uuid;

do $migration$
begin
  update public.despesas d set proprietario_id = u.id
  from public.usuarios u
  where d.proprietario_id is null and u.empresa_id=d.empresa_id
    and (select count(*) from public.usuarios ux where ux.empresa_id=d.empresa_id)=1;
  update public.contas_fixas c set proprietario_id = u.id
  from public.usuarios u
  where c.proprietario_id is null and u.empresa_id=c.empresa_id
    and (select count(*) from public.usuarios ux where ux.empresa_id=c.empresa_id)=1;
  update public.contas_fixas set data_base=make_date(extract(year from current_date)::integer,extract(month from current_date)::integer,least(dia_vencimento,extract(day from (date_trunc('month',current_date)+interval '1 month - 1 day'))::integer)) where data_base is null;
  if exists(select 1 from public.despesas where proprietario_id is null)
     or exists(select 1 from public.contas_fixas where proprietario_id is null) then
    raise exception 'ABORTADO: ownership pessoal legado ambíguo; atribua explicitamente antes de reaplicar';
  end if;
end $migration$;

alter table public.despesas alter column proprietario_id set not null;
alter table public.contas_fixas alter column proprietario_id set not null;
alter table public.contas_fixas alter column data_base set not null;
create index if not exists despesas_owner_periodo_idx on public.despesas(empresa_id,proprietario_id,data_lancamento);
create index if not exists contas_fixas_owner_base_idx on public.contas_fixas(empresa_id,proprietario_id,data_base);
create unique index if not exists despesas_pagamento_evento_uq on public.despesas(pagamento_evento_id) where pagamento_evento_id is not null;
create unique index if not exists despesas_estorno_evento_uq on public.despesas(estorno_evento_id) where estorno_evento_id is not null;

alter table public.despesas enable row level security;
alter table public.contas_fixas enable row level security;
do $policies$
declare p record;
begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in('despesas','contas_fixas') loop
  execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 end loop;
end $policies$;
drop policy if exists despesas_select_tenant on public.despesas;
drop policy if exists despesas_insert_tenant on public.despesas;
drop policy if exists despesas_update_tenant on public.despesas;
drop policy if exists despesas_delete_tenant on public.despesas;
drop policy if exists contas_fixas_select_tenant on public.contas_fixas;
drop policy if exists contas_fixas_insert_tenant on public.contas_fixas;
drop policy if exists contas_fixas_update_tenant on public.contas_fixas;
drop policy if exists contas_fixas_delete_tenant on public.contas_fixas;
create policy despesas_select_owner on public.despesas for select to authenticated using(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id));
create policy despesas_insert_owner on public.despesas for insert to authenticated with check(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id));
create policy despesas_update_owner on public.despesas for update to authenticated using(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id)) with check(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id));
create policy despesas_delete_owner on public.despesas for delete to authenticated using(proprietario_id=(select auth.uid()) and pagamento_evento_id is null and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=despesas.empresa_id));
create policy contas_fixas_select_owner on public.contas_fixas for select to authenticated using(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));
create policy contas_fixas_insert_owner on public.contas_fixas for insert to authenticated with check(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));
create policy contas_fixas_update_owner on public.contas_fixas for update to authenticated using(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id)) with check(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));
create policy contas_fixas_delete_owner on public.contas_fixas for delete to authenticated using(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_fixas.empresa_id));
revoke all on public.despesas,public.contas_fixas from anon;
grant select,insert,update,delete on public.despesas,public.contas_fixas to authenticated;

create table if not exists public.contas_pagar_pessoais_pagamento_eventos(
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
 proprietario_id uuid not null references auth.users(id) on delete restrict, conta_pagar_pessoal_id uuid,
 entrada_id uuid, tipo text not null check(tipo in('Pagamento','Antecipacao','Entrada','Estorno')),
 valor_nominal numeric(14,2) not null check(valor_nominal>0), valor_pago numeric(14,2) not null check(valor_pago>0),
 desconto_obtido numeric(14,2) not null default 0 check(desconto_obtido>=0), pago_em date not null,
 observacoes text,idempotency_key uuid not null,estorno_de_evento_id uuid references public.contas_pagar_pessoais_pagamento_eventos(id) on delete restrict,
 autor_id uuid not null references auth.users(id) on delete restrict,criado_em timestamptz not null default now(),
 unique(empresa_id,proprietario_id,idempotency_key),unique(estorno_de_evento_id),
 foreign key(conta_pagar_pessoal_id) references public.contas_pagar_pessoais(id) on delete restrict,
 check(desconto_obtido=valor_nominal-valor_pago)
);
alter table public.contas_pagar_pessoais_pagamento_eventos enable row level security;
drop policy if exists cpp_pag_eventos_select_tenant on public.contas_pagar_pessoais_pagamento_eventos;
drop policy if exists cpp_pag_eventos_insert_tenant on public.contas_pagar_pessoais_pagamento_eventos;
create policy cpp_pag_eventos_select_owner on public.contas_pagar_pessoais_pagamento_eventos for select to authenticated using(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_pagamento_eventos.empresa_id));
revoke all on public.contas_pagar_pessoais_pagamento_eventos from public,anon,authenticated;
grant select on public.contas_pagar_pessoais_pagamento_eventos to authenticated;

create or replace function public.proteger_financeiro_conta_pessoal_paga() returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if (old.status='Pago' or exists(select 1 from public.contas_pagar_pessoais_pagamento_eventos e where e.conta_pagar_pessoal_id=old.id and e.tipo in('Pagamento','Antecipacao')))
 and (new.valor is distinct from old.valor or new.vencimento is distinct from old.vencimento
  or new.grupo_parcelamento_id is distinct from old.grupo_parcelamento_id or new.parcela_numero is distinct from old.parcela_numero
  or new.parcelas_total is distinct from old.parcelas_total or new.valor_total_compra is distinct from old.valor_total_compra
  or new.periodicidade is distinct from old.periodicidade) then
  raise exception 'Campos financeiros de obrigação liquidada são imutáveis';
 end if; return new;
end $fn$;
drop trigger if exists proteger_financeiro_conta_pessoal_paga on public.contas_pagar_pessoais;
create trigger proteger_financeiro_conta_pessoal_paga before update on public.contas_pagar_pessoais for each row execute function public.proteger_financeiro_conta_pessoal_paga();

create or replace function public.registrar_pagamento_conta_pessoal(p_conta_pagar_pessoal_id uuid,p_empresa_id uuid,p_proprietario_id uuid,p_tipo text,p_valor_pago numeric,p_pago_em date,p_observacoes text,p_idempotency_key uuid)
returns public.contas_pagar_pessoais_pagamento_eventos language plpgsql security invoker set search_path='' as $fn$
declare c public.contas_pagar_pessoais%rowtype;e public.contas_pagar_pessoais_pagamento_eventos%rowtype;v numeric(14,2);
begin
 if p_proprietario_id is distinct from (select auth.uid()) or not exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=p_empresa_id) then raise exception 'Escopo não autorizado';end if;
 if p_tipo not in('Pagamento','Antecipacao') or p_valor_pago<=0 or p_pago_em is null or p_idempotency_key is null then raise exception 'Pagamento inválido';end if;
 select * into e from public.contas_pagar_pessoais_pagamento_eventos where empresa_id=p_empresa_id and proprietario_id=p_proprietario_id and idempotency_key=p_idempotency_key;
 if found then return e;end if;
 select * into c from public.contas_pagar_pessoais where id=p_conta_pagar_pessoal_id and empresa_id=p_empresa_id and proprietario_id=p_proprietario_id for update;
 if not found or c.status<>'Pendente' then raise exception 'Obrigação não disponível para pagamento';end if;
 v=round(p_valor_pago,2);if (p_tipo='Pagamento' and v<>c.valor) or v>c.valor then raise exception 'Valor de pagamento inválido';end if;
 insert into public.contas_pagar_pessoais_pagamento_eventos(empresa_id,proprietario_id,conta_pagar_pessoal_id,tipo,valor_nominal,valor_pago,desconto_obtido,pago_em,observacoes,idempotency_key,autor_id)
 values(p_empresa_id,p_proprietario_id,c.id,p_tipo,c.valor,v,c.valor-v,p_pago_em,nullif(btrim(p_observacoes),''),p_idempotency_key,(select auth.uid())) returning * into e;
 insert into public.despesas(tipo,categoria,descricao,valor,data_lancamento,empresa_id,proprietario_id,ativo,pagamento_evento_id,origem_tipo)
 values('despesa',c.categoria,'Pagamento de Conta a Pagar: '||c.descricao,v,p_pago_em,p_empresa_id,p_proprietario_id,true,e.id,e.tipo);
 update public.contas_pagar_pessoais set status='Pago' where id=c.id;return e;
end $fn$;

create or replace function public.estornar_pagamento_conta_pessoal(p_evento_pagamento_id uuid,p_empresa_id uuid,p_proprietario_id uuid,p_estornado_em date,p_observacoes text,p_idempotency_key uuid)
returns public.contas_pagar_pessoais_pagamento_eventos language plpgsql security invoker set search_path='' as $fn$
declare o public.contas_pagar_pessoais_pagamento_eventos%rowtype;e public.contas_pagar_pessoais_pagamento_eventos%rowtype;
begin
 if p_proprietario_id is distinct from (select auth.uid()) or not exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=p_empresa_id) then raise exception 'Escopo não autorizado';end if;
 select * into e from public.contas_pagar_pessoais_pagamento_eventos where empresa_id=p_empresa_id and proprietario_id=p_proprietario_id and idempotency_key=p_idempotency_key;if found then return e;end if;
 select * into o from public.contas_pagar_pessoais_pagamento_eventos where id=p_evento_pagamento_id and empresa_id=p_empresa_id and proprietario_id=p_proprietario_id and tipo in('Pagamento','Antecipacao') for update;
 if not found or p_estornado_em<o.pago_em or exists(select 1 from public.contas_pagar_pessoais_pagamento_eventos x where x.estorno_de_evento_id=o.id) then raise exception 'Estorno inválido ou duplicado';end if;
 insert into public.contas_pagar_pessoais_pagamento_eventos(empresa_id,proprietario_id,conta_pagar_pessoal_id,tipo,valor_nominal,valor_pago,desconto_obtido,pago_em,observacoes,idempotency_key,estorno_de_evento_id,autor_id)
 values(p_empresa_id,p_proprietario_id,o.conta_pagar_pessoal_id,'Estorno',o.valor_nominal,o.valor_pago,o.desconto_obtido,p_estornado_em,nullif(btrim(p_observacoes),''),p_idempotency_key,o.id,(select auth.uid())) returning * into e;
 update public.despesas set ativo=false,estorno_evento_id=e.id,estornada_em=p_estornado_em where pagamento_evento_id=o.id and empresa_id=p_empresa_id and proprietario_id=p_proprietario_id and ativo=true;
 update public.contas_pagar_pessoais set status='Pendente' where id=o.conta_pagar_pessoal_id and empresa_id=p_empresa_id and proprietario_id=p_proprietario_id;return e;
end $fn$;

revoke execute on function public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid) from public,anon;
revoke execute on function public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid) from public,anon;
grant execute on function public.registrar_pagamento_conta_pessoal(uuid,uuid,uuid,text,numeric,date,text,uuid) to authenticated;
grant execute on function public.estornar_pagamento_conta_pessoal(uuid,uuid,uuid,date,text,uuid) to authenticated;

create table if not exists public.contas_pagar_pessoais_grupo_metadados(
 grupo_parcelamento_id uuid primary key,empresa_id uuid not null references public.empresas(id) on delete restrict,
 proprietario_id uuid not null references auth.users(id) on delete restrict,nome_amigavel text,descricao text not null,
 fornecedor text,categoria text,observacoes text,versao integer not null default 1 check(versao>0),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),
 unique(grupo_parcelamento_id,empresa_id,proprietario_id));
alter table public.contas_pagar_pessoais_grupo_metadados enable row level security;
drop policy if exists cpp_grupo_metadata_owner on public.contas_pagar_pessoais_grupo_metadados;
create policy cpp_grupo_metadata_owner on public.contas_pagar_pessoais_grupo_metadados for all to authenticated using(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_grupo_metadados.empresa_id)) with check(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_grupo_metadados.empresa_id));
revoke all on public.contas_pagar_pessoais_grupo_metadados from public,anon;
grant select,insert,update on public.contas_pagar_pessoais_grupo_metadados to authenticated;

create or replace function public.atualizar_metadados_grupo_conta_pessoal(p_grupo uuid,p_empresa uuid,p_proprietario uuid,p_versao_esperada integer,p_nome text,p_descricao text,p_fornecedor text,p_categoria text,p_observacoes text)
returns public.contas_pagar_pessoais_grupo_metadados language plpgsql security invoker set search_path='' as $fn$
declare r public.contas_pagar_pessoais_grupo_metadados%rowtype;
begin
 if p_proprietario is distinct from (select auth.uid()) or nullif(btrim(p_descricao),'') is null or not exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=p_empresa) then raise exception 'Escopo ou descrição inválidos';end if;
 if not exists(select 1 from public.contas_pagar_pessoais p where p.grupo_parcelamento_id=p_grupo and p.empresa_id=p_empresa and p.proprietario_id=p_proprietario) then raise exception 'Grupo não encontrado';end if;
 select * into r from public.contas_pagar_pessoais_grupo_metadados where grupo_parcelamento_id=p_grupo for update;
 if found and r.versao<>p_versao_esperada then raise exception 'Versão concorrente divergente';end if;
 insert into public.contas_pagar_pessoais_grupo_metadados(grupo_parcelamento_id,empresa_id,proprietario_id,nome_amigavel,descricao,fornecedor,categoria,observacoes,versao)
 values(p_grupo,p_empresa,p_proprietario,nullif(btrim(p_nome),''),btrim(p_descricao),nullif(btrim(p_fornecedor),''),nullif(btrim(p_categoria),''),nullif(btrim(p_observacoes),''),1)
 on conflict(grupo_parcelamento_id) do update set nome_amigavel=excluded.nome_amigavel,descricao=excluded.descricao,fornecedor=excluded.fornecedor,categoria=excluded.categoria,observacoes=excluded.observacoes,versao=public.contas_pagar_pessoais_grupo_metadados.versao+1,atualizado_em=now()
 returning * into r;return r;
end $fn$;

create or replace function public.criar_parcelamento_conta_pessoal(p_empresa_id uuid,p_proprietario_id uuid,p_idempotency_key uuid,p_descricao text,p_fornecedor text,p_valor_total numeric,p_quantidade integer,p_valor_primeira_parcela numeric,p_primeiro_vencimento date,p_periodicidade text,p_categoria text,p_observacoes text)
returns setof public.contas_pagar_pessoais language plpgsql security invoker set search_path='' as $fn$
declare g uuid:=gen_random_uuid();total_c bigint;primeira bigint;base bigint;valor_c bigint;mes date;dia integer;i integer;
begin
 if p_proprietario_id is distinct from (select auth.uid()) or not exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=p_empresa_id) then raise exception 'Escopo não autorizado';end if;
 if p_idempotency_key is null or nullif(btrim(p_descricao),'') is null or p_valor_total<=0 or p_quantidade not between 2 and 120 or p_primeiro_vencimento is null or p_periodicidade<>'Mensal' then raise exception 'Parcelamento inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text,0));
 if exists(select 1 from public.contas_pagar_pessoais p where p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id and p.idempotency_key=p_idempotency_key) then return query select p.* from public.contas_pagar_pessoais p where p.empresa_id=p_empresa_id and p.proprietario_id=p_proprietario_id and p.idempotency_key=p_idempotency_key order by p.parcela_numero;return;end if;
 total_c=round(p_valor_total*100);primeira=coalesce(round(p_valor_primeira_parcela*100),total_c/p_quantidade);if primeira<=0 or primeira>=total_c then raise exception 'Primeira parcela inválida';end if;
 base=(total_c-primeira)/(p_quantidade-1);dia=extract(day from p_primeiro_vencimento);
 for i in 1..p_quantidade loop valor_c=case when i=1 then primeira when i=p_quantidade then total_c-primeira-base*(p_quantidade-2) else base end;mes=date_trunc('month',p_primeiro_vencimento)::date+make_interval(months=>i-1);insert into public.contas_pagar_pessoais(empresa_id,proprietario_id,descricao,fornecedor,valor,vencimento,status,categoria,observacoes,grupo_parcelamento_id,parcela_numero,parcelas_total,valor_total_compra,periodicidade,idempotency_key) values(p_empresa_id,p_proprietario_id,btrim(p_descricao),nullif(btrim(p_fornecedor),''),valor_c/100.0,mes+least(dia,extract(day from(mes+interval '1 month - 1 day'))::integer)-1,'Pendente',nullif(btrim(p_categoria),''),nullif(btrim(p_observacoes),''),g,i,p_quantidade,total_c/100.0,'Mensal',p_idempotency_key);end loop;
 return query select p.* from public.contas_pagar_pessoais p where p.grupo_parcelamento_id=g order by p.parcela_numero;
end $fn$;

revoke execute on function public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,integer,text,text,text,text,text) from public,anon;
revoke execute on function public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text) from public,anon;
grant execute on function public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,integer,text,text,text,text,text) to authenticated;
grant execute on function public.criar_parcelamento_conta_pessoal(uuid,uuid,uuid,text,text,numeric,integer,numeric,date,text,text,text) to authenticated;

create table if not exists public.contas_pagar_pessoais_entradas(
 id uuid primary key default gen_random_uuid(),grupo_parcelamento_id uuid not null unique,empresa_id uuid not null references public.empresas(id) on delete restrict,
 proprietario_id uuid not null references auth.users(id) on delete restrict,idempotency_key uuid not null,descricao text not null,fornecedor text,
 valor_total_compra numeric(14,2) not null,valor_entrada numeric(14,2) not null,saldo_financiado numeric(14,2) not null,data_entrada date not null,
 parcelas_total integer not null,primeiro_vencimento date not null,periodicidade text not null,categoria text,observacoes text,criado_em timestamptz not null default now(),
 unique(empresa_id,proprietario_id,idempotency_key));
alter table public.contas_pagar_pessoais_entradas enable row level security;
drop policy if exists cpp_entradas_owner on public.contas_pagar_pessoais_entradas;
create policy cpp_entradas_owner on public.contas_pagar_pessoais_entradas for select to authenticated using(proprietario_id=(select auth.uid()) and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=contas_pagar_pessoais_entradas.empresa_id));
revoke all on public.contas_pagar_pessoais_entradas from public,anon,authenticated;
grant select on public.contas_pagar_pessoais_entradas to authenticated;

create or replace function public.criar_parcelamento_conta_pessoal_com_entrada(p_empresa_id uuid,p_proprietario_id uuid,p_idempotency_key uuid,p_descricao text,p_fornecedor text,p_valor_total numeric,p_valor_entrada numeric,p_data_entrada date,p_quantidade integer,p_primeiro_vencimento date,p_periodicidade text,p_categoria text,p_observacoes text)
returns setof public.contas_pagar_pessoais language plpgsql security invoker set search_path='' as $fn$
declare h public.contas_pagar_pessoais_entradas%rowtype;ev public.contas_pagar_pessoais_pagamento_eventos%rowtype;g uuid:=gen_random_uuid();
begin
 if p_proprietario_id is distinct from (select auth.uid()) or not exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=p_empresa_id) then raise exception 'Escopo não autorizado';end if;
 if p_valor_entrada<=0 or p_valor_entrada>=p_valor_total or p_data_entrada is null then raise exception 'Entrada inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text,0));
 select * into h from public.contas_pagar_pessoais_entradas where empresa_id=p_empresa_id and proprietario_id=p_proprietario_id and idempotency_key=p_idempotency_key;
 if found then return query select p.* from public.contas_pagar_pessoais p where p.entrada_id=h.id order by p.parcela_numero;return;end if;
 insert into public.contas_pagar_pessoais_entradas(grupo_parcelamento_id,empresa_id,proprietario_id,idempotency_key,descricao,fornecedor,valor_total_compra,valor_entrada,saldo_financiado,data_entrada,parcelas_total,primeiro_vencimento,periodicidade,categoria,observacoes)
 values(g,p_empresa_id,p_proprietario_id,p_idempotency_key,btrim(p_descricao),nullif(btrim(p_fornecedor),''),round(p_valor_total,2),round(p_valor_entrada,2),round(p_valor_total-p_valor_entrada,2),p_data_entrada,p_quantidade,p_primeiro_vencimento,'Mensal',nullif(btrim(p_categoria),''),nullif(btrim(p_observacoes),'')) returning * into h;
 insert into public.contas_pagar_pessoais_pagamento_eventos(empresa_id,proprietario_id,entrada_id,tipo,valor_nominal,valor_pago,desconto_obtido,pago_em,observacoes,idempotency_key,autor_id)
 values(p_empresa_id,p_proprietario_id,h.id,'Entrada',h.valor_entrada,h.valor_entrada,0,h.data_entrada,h.observacoes,p_idempotency_key,(select auth.uid())) returning * into ev;
 insert into public.despesas(tipo,categoria,descricao,valor,data_lancamento,empresa_id,proprietario_id,ativo,pagamento_evento_id,origem_tipo) values('despesa',h.categoria,'Entrada: '||h.descricao,h.valor_entrada,h.data_entrada,p_empresa_id,p_proprietario_id,true,ev.id,'Entrada');
 return query select p.* from public.criar_parcelamento_conta_pessoal(p_empresa_id,p_proprietario_id,p_idempotency_key,p_descricao,p_fornecedor,h.saldo_financiado,p_quantidade,null,p_primeiro_vencimento,'Mensal',p_categoria,p_observacoes) p;
 update public.contas_pagar_pessoais set grupo_parcelamento_id=g,valor_total_compra=p_valor_total,entrada_id=h.id where empresa_id=p_empresa_id and proprietario_id=p_proprietario_id and idempotency_key=p_idempotency_key;
end $fn$;
revoke execute on function public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text) from public,anon;
grant execute on function public.criar_parcelamento_conta_pessoal_com_entrada(uuid,uuid,uuid,text,text,numeric,numeric,date,integer,date,text,text,text) to authenticated;
