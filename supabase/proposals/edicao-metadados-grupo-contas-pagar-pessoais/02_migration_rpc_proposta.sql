-- PROPOSTA LOCAL. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPLÍCITA.
begin;

do $guards$
begin
 if to_regclass('public.contas_pagar_pessoais_grupo_metadados') is not null
 or to_regprocedure('public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,bigint,text,text,text,text,text)') is not null then
  raise exception 'ABORTADO: estrutura já existe total ou parcialmente';
 end if;
 if (select count(*) from public.contas_pagar_pessoais
     where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)<>24
 or (select count(distinct descricao) from public.contas_pagar_pessoais
     where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)<>1
 or (select count(distinct coalesce(fornecedor,'')) from public.contas_pagar_pessoais
     where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)<>1
 or (select count(distinct coalesce(categoria,'')) from public.contas_pagar_pessoais
     where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)<>1
 or (select count(distinct coalesce(observacoes,'')) from public.contas_pagar_pessoais
     where grupo_parcelamento_id='0fcb172c-524c-4499-b93a-5d8d68203165'::uuid)<>1 then
  raise exception 'ABORTADO: grupo real divergiu';
 end if;
end $guards$;

create table public.contas_pagar_pessoais_grupo_metadados(
 grupo_parcelamento_id uuid primary key,
 empresa_id uuid not null references public.empresas(id) on delete restrict,
 proprietario_id uuid not null references auth.users(id) on delete restrict,
 nome_amigavel text,
 descricao text not null check(length(btrim(descricao))>0),
 fornecedor text,
 categoria text,
 observacoes text,
 versao bigint not null default 1 check(versao>0),
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 unique(grupo_parcelamento_id,empresa_id,proprietario_id)
);

alter table public.contas_pagar_pessoais_grupo_metadados enable row level security;
create policy cpp_grupo_meta_select on public.contas_pagar_pessoais_grupo_metadados
 for select to authenticated using(proprietario_id=(select auth.uid()) and exists(
  select 1 from public.usuarios u where u.id=(select auth.uid())
   and u.empresa_id=contas_pagar_pessoais_grupo_metadados.empresa_id));
create policy cpp_grupo_meta_insert on public.contas_pagar_pessoais_grupo_metadados
 for insert to authenticated with check(proprietario_id=(select auth.uid()) and exists(
  select 1 from public.usuarios u where u.id=(select auth.uid())
   and u.empresa_id=contas_pagar_pessoais_grupo_metadados.empresa_id));
create policy cpp_grupo_meta_update on public.contas_pagar_pessoais_grupo_metadados
 for update to authenticated using(proprietario_id=(select auth.uid()) and exists(
  select 1 from public.usuarios u where u.id=(select auth.uid())
   and u.empresa_id=contas_pagar_pessoais_grupo_metadados.empresa_id))
 with check(proprietario_id=(select auth.uid()) and exists(
  select 1 from public.usuarios u where u.id=(select auth.uid())
   and u.empresa_id=contas_pagar_pessoais_grupo_metadados.empresa_id));
revoke all on public.contas_pagar_pessoais_grupo_metadados from public,anon,authenticated;
grant select,insert,update on public.contas_pagar_pessoais_grupo_metadados to authenticated;

create function public.atualizar_metadados_grupo_conta_pessoal(
 p_grupo uuid,p_empresa uuid,p_proprietario uuid,p_versao_esperada bigint,
 p_nome text,p_descricao text,p_fornecedor text,p_categoria text,p_observacoes text)
returns public.contas_pagar_pessoais_grupo_metadados
language plpgsql security invoker set search_path=''
as $rpc$
declare v_atual public.contas_pagar_pessoais_grupo_metadados%rowtype; v_count integer;
begin
 if (select auth.uid()) is null or p_proprietario is distinct from (select auth.uid())
 or not exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.empresa_id=p_empresa)
 or p_grupo is null or nullif(btrim(p_descricao),'') is null or p_versao_esperada is null then
  raise exception 'Escopo ou metadados inválidos';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_grupo::text,0));
 perform 1 from public.contas_pagar_pessoais p where p.grupo_parcelamento_id=p_grupo
  and p.empresa_id=p_empresa and p.proprietario_id=p_proprietario order by p.parcela_numero for update;
 get diagnostics v_count=row_count;
 if v_count<2 or v_count<>(select max(parcelas_total) from public.contas_pagar_pessoais
   where grupo_parcelamento_id=p_grupo and empresa_id=p_empresa and proprietario_id=p_proprietario)
 or (select count(distinct valor_total_compra) from public.contas_pagar_pessoais
   where grupo_parcelamento_id=p_grupo and empresa_id=p_empresa and proprietario_id=p_proprietario)<>1 then
  raise exception 'Grupo incompleto ou financeiramente divergente';
 end if;
 select * into v_atual from public.contas_pagar_pessoais_grupo_metadados
  where grupo_parcelamento_id=p_grupo for update;
 if found then
  if v_atual.versao<>p_versao_esperada then raise exception 'Versão concorrente divergente'; end if;
  update public.contas_pagar_pessoais_grupo_metadados set
   nome_amigavel=nullif(btrim(p_nome),''),descricao=btrim(p_descricao),
   fornecedor=nullif(btrim(p_fornecedor),''),categoria=nullif(btrim(p_categoria),''),
   observacoes=nullif(btrim(p_observacoes),''),versao=versao+1,atualizado_em=now()
  where grupo_parcelamento_id=p_grupo returning * into v_atual;
 else
  if p_versao_esperada<>0 then raise exception 'Cabeçalho inexistente exige versão zero'; end if;
  insert into public.contas_pagar_pessoais_grupo_metadados(
   grupo_parcelamento_id,empresa_id,proprietario_id,nome_amigavel,descricao,fornecedor,categoria,observacoes)
  values(p_grupo,p_empresa,p_proprietario,nullif(btrim(p_nome),''),btrim(p_descricao),
   nullif(btrim(p_fornecedor),''),nullif(btrim(p_categoria),''),nullif(btrim(p_observacoes),''))
  returning * into v_atual;
 end if;
 return v_atual;
end $rpc$;
revoke all on function public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,bigint,text,text,text,text,text) from public,anon;
grant execute on function public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,bigint,text,text,text,text,text) to authenticated;
commit;
