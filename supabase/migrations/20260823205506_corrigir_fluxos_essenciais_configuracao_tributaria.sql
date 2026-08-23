-- Correções essenciais e isoladas de Configuração Tributária / Notas Fiscais.

create or replace function public.cf_pode_alterar_tributario(p_empresa_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = p_empresa_id
      and u.status = 'ATIVO'
      and (u.role in ('cliente', 'master') or coalesce(u.master_admin, false))
  );
$$;

revoke all on function public.cf_pode_alterar_tributario(uuid) from public, anon;
grant execute on function public.cf_pode_alterar_tributario(uuid) to authenticated;

drop policy if exists "config tributaria: insercao na empresa" on public.empresa_configuracoes_tributarias;
create policy "config tributaria: insercao por responsavel"
on public.empresa_configuracoes_tributarias for insert to authenticated
with check (
  criado_por = (select auth.uid())
  and public.cf_pode_alterar_tributario(empresa_id)
);

drop policy if exists "config tributaria: encerramento na empresa" on public.empresa_configuracoes_tributarias;
create policy "config tributaria: encerramento por responsavel"
on public.empresa_configuracoes_tributarias for update to authenticated
using (public.cf_pode_alterar_tributario(empresa_id))
with check (public.cf_pode_alterar_tributario(empresa_id));

drop policy if exists "regras tributarias: cadastro versionado na empresa" on public.empresa_regras_tributarias;
create policy "regras tributarias: cadastro por responsavel"
on public.empresa_regras_tributarias for insert to authenticated
with check (
  criado_por = (select auth.uid())
  and public.cf_pode_alterar_tributario(empresa_id)
);

drop policy if exists "alertas tributarios: cadastro na empresa" on public.empresa_alertas_tributarios;
create policy "alertas tributarios: cadastro por responsavel"
on public.empresa_alertas_tributarios for insert to authenticated
with check (public.cf_pode_alterar_tributario(empresa_id));

drop policy if exists "alertas tributarios: resolucao na empresa" on public.empresa_alertas_tributarios;
create policy "alertas tributarios: resolucao por responsavel"
on public.empresa_alertas_tributarios for update to authenticated
using (public.cf_pode_alterar_tributario(empresa_id))
with check (public.cf_pode_alterar_tributario(empresa_id));

create table public.empresa_verificacoes_tributarias (
  empresa_id uuid primary key references public.empresas(id) on update cascade on delete restrict,
  ultima_verificacao timestamptz not null default statement_timestamp(),
  verificado_por uuid not null default auth.uid() references auth.users(id) on update cascade on delete restrict
);

alter table public.empresa_verificacoes_tributarias enable row level security;

create policy "verificacao tributaria: leitura da empresa"
on public.empresa_verificacoes_tributarias for select to authenticated
using (exists (
  select 1 from public.usuarios u
  where u.id = (select auth.uid()) and u.empresa_id = empresa_verificacoes_tributarias.empresa_id
));

create policy "verificacao tributaria: cadastro por responsavel"
on public.empresa_verificacoes_tributarias for insert to authenticated
with check (
  verificado_por = (select auth.uid())
  and public.cf_pode_alterar_tributario(empresa_id)
);

create policy "verificacao tributaria: atualizacao por responsavel"
on public.empresa_verificacoes_tributarias for update to authenticated
using (public.cf_pode_alterar_tributario(empresa_id))
with check (
  verificado_por = (select auth.uid())
  and public.cf_pode_alterar_tributario(empresa_id)
);

grant select, insert, update on public.empresa_verificacoes_tributarias to authenticated;
revoke all on public.empresa_verificacoes_tributarias from anon;

create or replace function public.registrar_verificacao_tributaria(p_empresa_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quando timestamptz := statement_timestamp();
begin
  if not public.cf_pode_alterar_tributario(p_empresa_id) then
    raise exception using errcode = '42501', message = 'alteracao_tributaria_nao_autorizada';
  end if;

  insert into public.empresa_verificacoes_tributarias (empresa_id, ultima_verificacao, verificado_por)
  values (p_empresa_id, v_quando, (select auth.uid()))
  on conflict (empresa_id) do update
    set ultima_verificacao = excluded.ultima_verificacao,
        verificado_por = excluded.verificado_por;

  return v_quando;
end;
$$;

revoke all on function public.registrar_verificacao_tributaria(uuid) from public, anon;
grant execute on function public.registrar_verificacao_tributaria(uuid) to authenticated;

drop policy if exists empresa_notas_fiscais_insert on public.empresa_notas_fiscais_tributarias;
create policy empresa_notas_fiscais_insert_responsavel on public.empresa_notas_fiscais_tributarias
for insert to authenticated with check (
  criado_por = (select auth.uid()) and public.cf_pode_alterar_tributario(empresa_id)
);

drop policy if exists empresa_notas_fiscais_update on public.empresa_notas_fiscais_tributarias;
create policy empresa_notas_fiscais_update_responsavel on public.empresa_notas_fiscais_tributarias
for update to authenticated
using (public.cf_pode_alterar_tributario(empresa_id))
with check (public.cf_pode_alterar_tributario(empresa_id));

drop policy if exists empresa_notas_fiscais_delete on public.empresa_notas_fiscais_tributarias;
create policy empresa_notas_fiscais_delete_responsavel on public.empresa_notas_fiscais_tributarias
for delete to authenticated using (
  integracao_operacional is null and integrado_em is null
  and public.cf_pode_alterar_tributario(empresa_id)
);

drop policy if exists empresa_nota_fiscal_itens_insert on public.empresa_nota_fiscal_itens;
create policy empresa_nota_fiscal_itens_insert_responsavel on public.empresa_nota_fiscal_itens
for insert to authenticated with check (public.cf_pode_alterar_tributario(empresa_id));

drop policy if exists empresa_nota_fiscal_analises_insert on public.empresa_nota_fiscal_analises;
create policy empresa_nota_fiscal_analises_insert_responsavel on public.empresa_nota_fiscal_analises
for insert to authenticated with check (
  criado_por = (select auth.uid()) and public.cf_pode_alterar_tributario(empresa_id)
);

create or replace function public.importar_nota_fiscal_tributaria(
  p_empresa_id uuid,
  p_nota jsonb,
  p_itens jsonb,
  p_analise jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_nota_id uuid;
  v_item jsonb;
begin
  if not public.cf_pode_alterar_tributario(p_empresa_id) then
    raise exception using errcode = '42501', message = 'alteracao_tributaria_nao_autorizada';
  end if;
  if jsonb_typeof(coalesce(p_itens, '[]'::jsonb)) <> 'array' or jsonb_typeof(p_analise) <> 'object' then
    raise exception using errcode = '22023', message = 'nota_fiscal_payload_invalido';
  end if;

  insert into public.empresa_notas_fiscais_tributarias (
    empresa_id, numero, serie, chave_acesso, data_emissao, tipo_operacao, parte_nome, parte_cnpj,
    uf_emitente, uf_destinatario, valor_total, frete, icms, ipi, ibs, cbs, observacoes_fiscais,
    arquivo_nome, arquivo_tipo, confianca_extracao, status_tributario, regime_aplicado,
    modalidade_ibs_cbs, vigencia_inicio_usada, extracao_raw, analisada_em, criado_por
  ) values (
    p_empresa_id, p_nota->>'numero', p_nota->>'serie', p_nota->>'chave_acesso',
    (p_nota->>'data_emissao')::date, p_nota->>'tipo_operacao', p_nota->>'parte_nome', p_nota->>'parte_cnpj',
    p_nota->>'uf_emitente', p_nota->>'uf_destinatario', (p_nota->>'valor_total')::numeric,
    (p_nota->>'frete')::numeric, (p_nota->>'icms')::numeric, (p_nota->>'ipi')::numeric,
    (p_nota->>'ibs')::numeric, (p_nota->>'cbs')::numeric, p_nota->>'observacoes_fiscais',
    p_nota->>'arquivo_nome', p_nota->>'arquivo_tipo', (p_nota->>'confianca_extracao')::numeric,
    p_nota->>'status_tributario', p_nota->>'regime_aplicado', p_nota->>'modalidade_ibs_cbs',
    (p_nota->>'vigencia_inicio_usada')::date, coalesce(p_nota->'extracao_raw', '{}'::jsonb),
    coalesce((p_nota->>'analisada_em')::timestamptz, statement_timestamp()), (select auth.uid())
  ) returning id into v_nota_id;

  for v_item in select value from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb))
  loop
    insert into public.empresa_nota_fiscal_itens (
      empresa_id, nota_fiscal_id, item_ordem, descricao, ncm, cfop, cst_icms, csosn_icms,
      quantidade, unidade, peso, valor_unitario, valor_total, icms, ipi, ibs, cbs, confianca_extracao
    ) values (
      p_empresa_id, v_nota_id, (v_item->>'item_ordem')::integer, v_item->>'descricao',
      v_item->>'ncm', v_item->>'cfop', v_item->>'cst_icms', v_item->>'csosn_icms',
      (v_item->>'quantidade')::numeric, v_item->>'unidade', (v_item->>'peso')::numeric,
      (v_item->>'valor_unitario')::numeric, (v_item->>'valor_total')::numeric,
      (v_item->>'icms')::numeric, (v_item->>'ipi')::numeric, (v_item->>'ibs')::numeric,
      (v_item->>'cbs')::numeric, (v_item->>'confianca_extracao')::numeric
    );
  end loop;

  insert into public.empresa_nota_fiscal_analises (
    empresa_id, nota_fiscal_id, status, regime_aplicado, modalidade_ibs_cbs,
    vigencia_inicio_usada, quantidade_alertas, alertas, criado_por
  ) values (
    p_empresa_id, v_nota_id, p_analise->>'status', p_analise->>'regime_aplicado',
    p_analise->>'modalidade_ibs_cbs', (p_analise->>'vigencia_inicio_usada')::date,
    (p_analise->>'quantidade_alertas')::integer, coalesce(p_analise->'alertas', '[]'::jsonb),
    (select auth.uid())
  );

  return v_nota_id;
end;
$$;

revoke all on function public.importar_nota_fiscal_tributaria(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.importar_nota_fiscal_tributaria(uuid, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.revisar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_alertas jsonb;
  v_status text;
  v_quando timestamptz := statement_timestamp();
begin
  if not public.cf_pode_alterar_tributario(p_empresa_id) then
    raise exception using errcode = '42501', message = 'alteracao_tributaria_nao_autorizada';
  end if;

  select a.alertas into v_alertas
  from public.empresa_nota_fiscal_analises a
  where a.empresa_id = p_empresa_id and a.nota_fiscal_id = p_nota_fiscal_id
  order by a.analisada_em desc limit 1;
  if not found then
    raise exception using errcode = 'P0002', message = 'analise_tributaria_nao_encontrada';
  end if;

  if not exists (select 1 from jsonb_array_elements(v_alertas) x where coalesce(x->>'severity', '') <> 'INFO') then
    v_status := 'regular';
  elsif exists (
    select 1 from jsonb_array_elements(v_alertas) x
    where upper(coalesce(x->>'severity', x->>'classificacao', '')) in ('CRÍTICO', 'CRITICO')
  ) then
    v_status := 'critico';
  else
    v_status := 'atencao';
  end if;

  update public.empresa_notas_fiscais_tributarias
  set revisada_em = v_quando, revisada_por = (select auth.uid()), status_tributario = v_status, updated_at = v_quando
  where id = p_nota_fiscal_id and empresa_id = p_empresa_id and revisada_em is null;
  if not found then
    raise exception using errcode = 'P0002', message = 'nota_fiscal_nao_encontrada_ou_revisada';
  end if;
  return p_nota_fiscal_id;
end;
$$;

revoke all on function public.revisar_nota_fiscal_tributaria(uuid, uuid) from public, anon;
grant execute on function public.revisar_nota_fiscal_tributaria(uuid, uuid) to authenticated;

create or replace function public.proteger_autoria_revisao_tributaria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.revisada_em is not null and (
    new.revisada_em is distinct from old.revisada_em or new.revisada_por is distinct from old.revisada_por
  ) then
    raise exception using errcode = '42501', message = 'revisao_tributaria_imutavel';
  end if;
  if old.revisada_em is null and new.revisada_em is not null then
    new.revisada_em := statement_timestamp();
    new.revisada_por := (select auth.uid());
  elsif new.revisada_por is distinct from old.revisada_por then
    raise exception using errcode = '42501', message = 'autoria_revisao_nao_pode_ser_informada';
  end if;
  return new;
end;
$$;

create trigger proteger_autoria_revisao_tributaria
before update on public.empresa_notas_fiscais_tributarias
for each row execute function public.proteger_autoria_revisao_tributaria();

create or replace function public.excluir_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.cf_pode_alterar_tributario(p_empresa_id) then
    raise exception using errcode = '42501', message = 'alteracao_tributaria_nao_autorizada';
  end if;
  delete from public.empresa_notas_fiscais_tributarias
  where id = p_nota_fiscal_id and empresa_id = p_empresa_id
    and integracao_operacional is null and integrado_em is null;
  return found;
end;
$$;

revoke all on function public.excluir_nota_fiscal_tributaria(uuid, uuid) from public, anon;
grant execute on function public.excluir_nota_fiscal_tributaria(uuid, uuid) to authenticated;
