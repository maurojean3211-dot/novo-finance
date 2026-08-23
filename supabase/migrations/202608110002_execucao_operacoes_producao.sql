-- Fase 28: execução manual das operações sequenciadas por recurso. Não aplicar automaticamente.

alter table public.ordem_producao_recursos
  add column if not exists status_operacao text not null default 'Pendente',
  add column if not exists inicio_real timestamptz,
  add column if not exists fim_real timestamptz;

alter table public.ordem_producao_recursos drop constraint if exists ordem_producao_recursos_status_operacao_check;
alter table public.ordem_producao_recursos add constraint ordem_producao_recursos_status_operacao_check
  check(status_operacao in ('Pendente','Liberada','Em execução','Pausada','Concluída','Cancelada'));

alter table public.ordem_producao_recursos
  add constraint ordem_producao_recursos_id_empresa_key unique(id,empresa_id);

create table public.ordem_producao_operacao_apontamentos (
  id uuid primary key default gen_random_uuid(),
  alocacao_id uuid not null,
  ordem_id uuid not null,
  recurso_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  idempotency_key uuid not null,
  tipo text not null check(tipo in ('Liberação','Início','Pausa','Retomada','Conclusão','Cancelamento')),
  ocorrido_em timestamptz not null,
  observacoes text,
  created_at timestamptz not null default now(),
  unique(empresa_id,idempotency_key),
  foreign key(alocacao_id,empresa_id) references public.ordem_producao_recursos(id,empresa_id) on update cascade on delete restrict,
  foreign key(ordem_id,empresa_id) references public.ordens_producao(id,empresa_id) on update cascade on delete restrict,
  foreign key(recurso_id,empresa_id) references public.recursos_producao(id,empresa_id) on update cascade on delete restrict
);

create index if not exists operacao_apontamentos_alocacao_idx
  on public.ordem_producao_operacao_apontamentos(empresa_id,alocacao_id,ocorrido_em desc);

alter table public.ordem_producao_operacao_apontamentos enable row level security;

create policy "operacao_apontamentos_select_empresa" on public.ordem_producao_operacao_apontamentos
  for select to authenticated using(exists(
    select 1 from public.ordem_producao_recursos opr
    join public.usuarios u on u.id=auth.uid() and u.empresa_id=opr.empresa_id
    where opr.id=ordem_producao_operacao_apontamentos.alocacao_id
      and opr.ordem_id=ordem_producao_operacao_apontamentos.ordem_id
      and opr.recurso_id=ordem_producao_operacao_apontamentos.recurso_id
      and opr.empresa_id=ordem_producao_operacao_apontamentos.empresa_id
  ));

create policy "operacao_apontamentos_insert_empresa" on public.ordem_producao_operacao_apontamentos
  for insert to authenticated with check(user_id=auth.uid() and exists(
    select 1 from public.ordem_producao_recursos opr
    join public.usuarios u on u.id=auth.uid() and u.empresa_id=opr.empresa_id
    where opr.id=ordem_producao_operacao_apontamentos.alocacao_id
      and opr.ordem_id=ordem_producao_operacao_apontamentos.ordem_id
      and opr.recurso_id=ordem_producao_operacao_apontamentos.recurso_id
      and opr.empresa_id=ordem_producao_operacao_apontamentos.empresa_id
  ));

create or replace function public.registrar_evento_operacao_producao(
  p_empresa_id uuid,
  p_alocacao_id uuid,
  p_evento text,
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
  v_novo_status text;
  v_tipo_historico text;
  v_ultimo_evento timestamptz;
begin
  if auth.uid() is null or not exists(
    select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id
  ) then
    raise exception 'Operação fora do escopo da empresa.' using errcode='42501';
  end if;
  if p_ocorrido_em is null or p_idempotency_key is null then
    raise exception 'Data e identificador do evento são obrigatórios.';
  end if;

  select * into v_alocacao from public.ordem_producao_recursos
  where id=p_alocacao_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Operação produtiva não encontrada.'; end if;

  select * into v_ordem from public.ordens_producao
  where id=v_alocacao.ordem_id and empresa_id=p_empresa_id;
  select * into v_recurso from public.recursos_producao
  where id=v_alocacao.recurso_id and empresa_id=p_empresa_id;
  if v_ordem.id is null or v_recurso.id is null then raise exception 'Operação fora do escopo da empresa.'; end if;

  if v_ordem.status in ('Concluída','Cancelada') and p_evento<>'Cancelamento' then
    raise exception 'A OP não permite novos eventos de execução.';
  end if;
  if p_evento='Liberação' and v_ordem.status not in ('Liberada','Em produção','Pausada') then
    raise exception 'Libere manualmente a OP antes de liberar sua operação.';
  end if;
  if p_evento in ('Início','Retomada') and v_ordem.status not in ('Em produção','Pausada') then
    raise exception 'A OP precisa estar em produção ou pausada para executar a operação.';
  end if;

  select max(ocorrido_em) into v_ultimo_evento
  from public.ordem_producao_operacao_apontamentos
  where alocacao_id=v_alocacao.id and empresa_id=p_empresa_id;
  if v_ultimo_evento is not null and p_ocorrido_em<v_ultimo_evento then
    raise exception 'A data do evento não pode ser anterior ao último evento da operação.';
  end if;

  v_novo_status := case
    when v_alocacao.status_operacao='Pendente' and p_evento='Liberação' then 'Liberada'
    when v_alocacao.status_operacao='Pendente' and p_evento='Cancelamento' then 'Cancelada'
    when v_alocacao.status_operacao='Liberada' and p_evento='Início' then 'Em execução'
    when v_alocacao.status_operacao='Liberada' and p_evento='Cancelamento' then 'Cancelada'
    when v_alocacao.status_operacao='Em execução' and p_evento='Pausa' then 'Pausada'
    when v_alocacao.status_operacao='Em execução' and p_evento='Conclusão' then 'Concluída'
    when v_alocacao.status_operacao='Pausada' and p_evento='Retomada' then 'Em execução'
    when v_alocacao.status_operacao='Pausada' and p_evento='Conclusão' then 'Concluída'
    when v_alocacao.status_operacao='Pausada' and p_evento='Cancelamento' then 'Cancelada'
    else null end;
  if v_novo_status is null then raise exception 'Transição operacional inválida.'; end if;

  update public.ordem_producao_recursos set
    status_operacao=v_novo_status,
    inicio_real=case when p_evento in ('Início','Retomada') then coalesce(inicio_real,p_ocorrido_em) else inicio_real end,
    fim_real=case when p_evento in ('Conclusão','Cancelamento') then p_ocorrido_em else fim_real end,
    user_id=auth.uid(), updated_at=now()
  where id=v_alocacao.id and empresa_id=p_empresa_id;

  insert into public.ordem_producao_operacao_apontamentos
    (alocacao_id,ordem_id,recurso_id,empresa_id,user_id,idempotency_key,tipo,ocorrido_em,observacoes)
  values(v_alocacao.id,v_ordem.id,v_recurso.id,p_empresa_id,auth.uid(),p_idempotency_key,p_evento,p_ocorrido_em,nullif(trim(p_observacoes),''));

  v_tipo_historico := case p_evento when 'Liberação' then 'Programação' when 'Cancelamento' then 'Cancelamento' else p_evento end;
  insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados)
  values(v_ordem.id,p_empresa_id,auth.uid(),v_tipo_historico,
    p_evento||' manual da operação no recurso '||v_recurso.nome||'.',
    jsonb_build_object('alocacao_id',v_alocacao.id,'recurso_id',v_recurso.id,'evento',p_evento,'status_operacao',v_novo_status,'ocorrido_em',p_ocorrido_em));
end;
$$;

grant select,insert on public.ordem_producao_operacao_apontamentos to authenticated;
revoke all on function public.registrar_evento_operacao_producao(uuid,uuid,text,timestamptz,text,uuid) from public;
grant execute on function public.registrar_evento_operacao_producao(uuid,uuid,text,timestamptz,text,uuid) to authenticated;

comment on table public.ordem_producao_operacao_apontamentos is
  'Eventos imutáveis da execução manual por recurso; não alteram automaticamente OP, venda, estoque ou prazo comercial.';
