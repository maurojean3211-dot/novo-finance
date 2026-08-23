create table public.orcamento_aprovacoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  decisao text not null check (decisao in ('Aprovado', 'Rejeitado')),
  observacao text not null check (length(trim(observacao)) > 0),
  created_at timestamptz not null default now(),
  foreign key (orcamento_id, empresa_id)
    references public.orcamentos(id, empresa_id)
    on update cascade
    on delete cascade
);

create index orcamento_aprovacoes_orcamento_idx
  on public.orcamento_aprovacoes (orcamento_id, created_at desc);

alter table public.orcamento_aprovacoes enable row level security;

create policy "orcamento_aprovacoes_select_empresa"
on public.orcamento_aprovacoes
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = orcamento_aprovacoes.empresa_id
  )
  and exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_aprovacoes.orcamento_id
      and o.empresa_id = orcamento_aprovacoes.empresa_id
  )
);

create policy "orcamento_aprovacoes_insert_empresa"
on public.orcamento_aprovacoes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = orcamento_aprovacoes.empresa_id
  )
  and exists (
    select 1
    from public.orcamentos o
    where o.id = orcamento_aprovacoes.orcamento_id
      and o.empresa_id = orcamento_aprovacoes.empresa_id
  )
);

create function public.registrar_decisao_orcamento(
  p_orcamento_id uuid,
  p_empresa_id uuid,
  p_decisao text,
  p_observacao text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_aprovacao_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_decisao not in ('Aprovado', 'Rejeitado') then
    raise exception 'Decisão inválida.';
  end if;

  if length(trim(coalesce(p_observacao, ''))) = 0 then
    raise exception 'A observação é obrigatória.';
  end if;

  if not exists (
    select 1
    from public.usuarios u
    join public.orcamentos o
      on o.empresa_id = u.empresa_id
     and o.id = p_orcamento_id
    where u.id = (select auth.uid())
      and u.empresa_id = p_empresa_id
  ) then
    raise exception 'Orçamento não pertence à empresa ativa.' using errcode = '42501';
  end if;

  insert into public.orcamento_aprovacoes (
    orcamento_id, empresa_id, user_id, decisao, observacao
  ) values (
    p_orcamento_id, p_empresa_id, (select auth.uid()), p_decisao, trim(p_observacao)
  )
  returning id into v_aprovacao_id;

  update public.orcamentos
  set status = p_decisao,
      updated_at = now()
  where id = p_orcamento_id
    and empresa_id = p_empresa_id;

  insert into public.orcamento_historico (
    orcamento_id, empresa_id, user_id, tipo, descricao
  ) values (
    p_orcamento_id,
    p_empresa_id,
    (select auth.uid()),
    case when p_decisao = 'Aprovado' then 'Aprovação' else 'Rejeição' end,
    p_decisao || ': ' || trim(p_observacao)
  );

  return v_aprovacao_id;
end;
$$;

grant select, insert on public.orcamento_aprovacoes to authenticated;
revoke update, delete on public.orcamento_aprovacoes from authenticated;
revoke all on function public.registrar_decisao_orcamento(uuid, uuid, text, text) from public;
grant execute on function public.registrar_decisao_orcamento(uuid, uuid, text, text) to authenticated;

comment on table public.orcamento_aprovacoes is
  'Histórico imutável das decisões de aprovação e rejeição de orçamentos.';
