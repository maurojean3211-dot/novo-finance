-- Fase 29: apontamentos operacionais e produtividade por recurso. Não aplicar automaticamente.

create table public.ordem_producao_operacao_resultados (
  id uuid primary key default gen_random_uuid(),
  alocacao_id uuid not null,
  ordem_id uuid not null,
  recurso_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  idempotency_key uuid not null,
  quantidade_boa numeric(14,4) not null default 0 check(quantidade_boa>=0),
  quantidade_refugada numeric(14,4) not null default 0 check(quantidade_refugada>=0),
  operador text not null check(length(trim(operador))>0),
  motivo_refugo text check(motivo_refugo is null or motivo_refugo in ('Qualidade','Processo','Matéria-prima','Equipamento','Medida','Outro')),
  ocorrido_em timestamptz not null,
  observacoes text,
  created_at timestamptz not null default now(),
  unique(empresa_id,idempotency_key),
  check(quantidade_boa+quantidade_refugada>0),
  check(quantidade_refugada=0 or motivo_refugo is not null),
  foreign key(alocacao_id,empresa_id) references public.ordem_producao_recursos(id,empresa_id) on update cascade on delete restrict,
  foreign key(ordem_id,empresa_id) references public.ordens_producao(id,empresa_id) on update cascade on delete restrict,
  foreign key(recurso_id,empresa_id) references public.recursos_producao(id,empresa_id) on update cascade on delete restrict
);

create index if not exists operacao_resultados_alocacao_idx
  on public.ordem_producao_operacao_resultados(empresa_id,alocacao_id,ocorrido_em desc);

alter table public.ordem_producao_operacao_resultados enable row level security;

create policy "operacao_resultados_select_empresa" on public.ordem_producao_operacao_resultados
  for select to authenticated using(exists(
    select 1 from public.ordem_producao_recursos opr
    join public.usuarios u on u.id=auth.uid() and u.empresa_id=opr.empresa_id
    where opr.id=ordem_producao_operacao_resultados.alocacao_id
      and opr.ordem_id=ordem_producao_operacao_resultados.ordem_id
      and opr.recurso_id=ordem_producao_operacao_resultados.recurso_id
      and opr.empresa_id=ordem_producao_operacao_resultados.empresa_id
  ));

create policy "operacao_resultados_insert_empresa" on public.ordem_producao_operacao_resultados
  for insert to authenticated with check(user_id=auth.uid() and exists(
    select 1 from public.ordem_producao_recursos opr
    join public.usuarios u on u.id=auth.uid() and u.empresa_id=opr.empresa_id
    where opr.id=ordem_producao_operacao_resultados.alocacao_id
      and opr.ordem_id=ordem_producao_operacao_resultados.ordem_id
      and opr.recurso_id=ordem_producao_operacao_resultados.recurso_id
      and opr.empresa_id=ordem_producao_operacao_resultados.empresa_id
  ));

create or replace function public.apontar_resultado_operacao_producao(
  p_empresa_id uuid,
  p_alocacao_id uuid,
  p_quantidade_boa numeric,
  p_quantidade_refugada numeric,
  p_operador text,
  p_motivo_refugo text,
  p_ocorrido_em timestamptz,
  p_observacoes text,
  p_idempotency_key uuid
) returns void
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_alocacao public.ordem_producao_recursos;
  v_ordem public.ordens_producao;
  v_recurso public.recursos_producao;
  v_apontado numeric;
  v_novo_total numeric;
  v_tipo_historico text;
begin
  if auth.uid() is null or not exists(
    select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id
  ) then
    raise exception 'Operação fora do escopo da empresa.' using errcode='42501';
  end if;
  if p_ocorrido_em is null or p_idempotency_key is null or length(trim(coalesce(p_operador,'')))=0 then
    raise exception 'Operador, data e identificador são obrigatórios.';
  end if;
  if coalesce(p_quantidade_boa,0)<0 or coalesce(p_quantidade_refugada,0)<0 or coalesce(p_quantidade_boa,0)+coalesce(p_quantidade_refugada,0)<=0 then
    raise exception 'Informe uma quantidade positiva.';
  end if;
  if coalesce(p_quantidade_refugada,0)>0 and p_motivo_refugo is null then
    raise exception 'Motivo do refugo é obrigatório.';
  end if;

  select * into v_alocacao from public.ordem_producao_recursos
  where id=p_alocacao_id and empresa_id=p_empresa_id for update;
  if not found or v_alocacao.status_operacao not in ('Em execução','Pausada') then
    raise exception 'A operação precisa estar em execução ou pausada.';
  end if;
  if v_alocacao.inicio_real is null or p_ocorrido_em<v_alocacao.inicio_real then
    raise exception 'A data do apontamento não pode ser anterior ao início real da operação.';
  end if;

  select * into v_ordem from public.ordens_producao where id=v_alocacao.ordem_id and empresa_id=p_empresa_id;
  select * into v_recurso from public.recursos_producao where id=v_alocacao.recurso_id and empresa_id=p_empresa_id;
  if v_ordem.id is null or v_recurso.id is null then raise exception 'Operação fora do escopo da empresa.'; end if;

  select coalesce(sum(quantidade_boa+quantidade_refugada),0) into v_apontado
  from public.ordem_producao_operacao_resultados
  where alocacao_id=v_alocacao.id and empresa_id=p_empresa_id;
  v_novo_total:=v_apontado+coalesce(p_quantidade_boa,0)+coalesce(p_quantidade_refugada,0);
  if v_novo_total>v_alocacao.quantidade_planejada then
    raise exception 'O apontamento supera a quantidade planejada da operação.';
  end if;

  insert into public.ordem_producao_operacao_resultados
    (alocacao_id,ordem_id,recurso_id,empresa_id,user_id,idempotency_key,quantidade_boa,quantidade_refugada,operador,motivo_refugo,ocorrido_em,observacoes)
  values(v_alocacao.id,v_ordem.id,v_recurso.id,p_empresa_id,auth.uid(),p_idempotency_key,coalesce(p_quantidade_boa,0),coalesce(p_quantidade_refugada,0),trim(p_operador),p_motivo_refugo,p_ocorrido_em,nullif(trim(p_observacoes),''));

  v_tipo_historico:=case when coalesce(p_quantidade_refugada,0)>0 then 'Perda' else 'Edição' end;
  insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados)
  values(v_ordem.id,p_empresa_id,auth.uid(),v_tipo_historico,
    'Resultado apontado manualmente na operação do recurso '||v_recurso.nome||'.',
    jsonb_build_object('alocacao_id',v_alocacao.id,'recurso_id',v_recurso.id,'quantidade_boa',coalesce(p_quantidade_boa,0),'quantidade_refugada',coalesce(p_quantidade_refugada,0),'operador',trim(p_operador),'motivo_refugo',p_motivo_refugo,'ocorrido_em',p_ocorrido_em));
end;
$$;

grant select,insert on public.ordem_producao_operacao_resultados to authenticated;
revoke all on function public.apontar_resultado_operacao_producao(uuid,uuid,numeric,numeric,text,text,timestamptz,text,uuid) from public;
grant execute on function public.apontar_resultado_operacao_producao(uuid,uuid,numeric,numeric,text,text,timestamptz,text,uuid) to authenticated;

comment on table public.ordem_producao_operacao_resultados is
  'Resultados imutáveis por operação e recurso; não atualizam automaticamente OP, estoque, venda, prazo ou financeiro.';
