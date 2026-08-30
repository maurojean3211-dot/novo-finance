begin;

-- Enforcement comercial adicional. Policies existentes continuam responsáveis
-- por empresa_id/proprietario_id; estas policies RESTRICTIVE acrescentam o
-- requisito de módulo sem criar caminhos permissivos por OR.

-- Compatibilidade com as permissões agrupadas do frontend atual. Somente
-- permissões já verdadeiras originam as chaves novas; energia, representações
-- e tributário não são concedidos automaticamente.
update public.usuarios
set permissoes = coalesce(permissoes, '{}'::jsonb)
  || case when coalesce((permissoes->>'vendas')::boolean,false)
       then '{"crm":true,"prospeccao":true,"orcamentos":true}'::jsonb else '{}'::jsonb end
  || case when coalesce((permissoes->>'compras')::boolean,false)
       then '{"estoque":true,"catalogo":true,"pcp":true}'::jsonb else '{}'::jsonb end
  || case when coalesce((permissoes->>'relatorio')::boolean,false)
       then '{"relatorios":true}'::jsonb else '{}'::jsonb end
  || case when
       coalesce((permissoes->>'pessoal')::boolean,false)
       or coalesce((permissoes->>'pessoal_visao_geral')::boolean,false)
       or coalesce((permissoes->>'pessoal_receitas')::boolean,false)
       or coalesce((permissoes->>'pessoal_despesas')::boolean,false)
       or coalesce((permissoes->>'pessoal_contas_pagar')::boolean,false)
       or coalesce((permissoes->>'pessoal_contas_fixas')::boolean,false)
       or coalesce((permissoes->>'pessoal_relatorios')::boolean,false)
       then '{"financas_pessoais":true}'::jsonb else '{}'::jsonb end
where permissoes is not null;

insert into public.plano_modulos (plano_id,modulo_key)
select distinct e.plano_id, m.modulo_key
from public.empresas e
join public.usuarios u on u.empresa_id=e.id and u.status='ATIVO'
cross join lateral (values
  ('financeiro', coalesce((u.permissoes->>'financeiro')::boolean,false)
    or coalesce((u.permissoes->>'contas_pagar')::boolean,false)
    or coalesce((u.permissoes->>'recebimentos')::boolean,false)),
  ('vendas', coalesce((u.permissoes->>'vendas')::boolean,false)),
  ('crm', coalesce((u.permissoes->>'crm')::boolean,false)),
  ('prospeccao', coalesce((u.permissoes->>'prospeccao')::boolean,false)),
  ('compras', coalesce((u.permissoes->>'compras')::boolean,false)),
  ('estoque', coalesce((u.permissoes->>'estoque')::boolean,false)),
  ('catalogo', coalesce((u.permissoes->>'catalogo')::boolean,false)),
  ('orcamentos', coalesce((u.permissoes->>'orcamentos')::boolean,false)),
  ('pcp', coalesce((u.permissoes->>'pcp')::boolean,false)),
  ('relatorios', coalesce((u.permissoes->>'relatorios')::boolean,false)),
  ('financas_pessoais', coalesce((u.permissoes->>'financas_pessoais')::boolean,false))
) as m(modulo_key,habilitado)
where e.plano_id is not null and m.habilitado
on conflict (plano_id,modulo_key) do nothing;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('despesas', 'financas_pessoais'),
      ('contas_fixas', 'financas_pessoais'),
      ('contas_pagar_pessoais', 'financas_pessoais'),
      ('contas_pagar_pessoais_entradas', 'financas_pessoais'),
      ('contas_pagar_pessoais_grupo_metadados', 'financas_pessoais'),
      ('contas_pagar_pessoais_pagamento_eventos', 'financas_pessoais'),
      ('orcamentos_pessoais_mensais', 'financas_pessoais'),

      ('contas_pagar', 'financeiro'),
      ('recebimentos', 'financeiro'),
      ('lancamentos', 'financeiro'),
      ('emprestimos', 'financeiro'),
      ('parcelas', 'financeiro'),
      ('financeiro_titulos', 'financeiro'),
      ('financeiro_baixas', 'financeiro'),
      ('financeiro_conciliacoes', 'financeiro'),
      ('financeiro_historico', 'financeiro'),

      ('crm_oportunidades', 'crm'),
      ('crm_oportunidade_historico', 'crm'),
      ('prospeccao_prospectos', 'prospeccao'),
      ('prospeccao_interacoes', 'prospeccao'),
      ('vendas', 'vendas'),

      ('compras', 'compras'),
      ('pedidos_compra', 'compras'),
      ('pedido_compra_followups', 'compras'),
      ('pedido_compra_historico', 'compras'),
      ('pedido_compra_parcelas', 'compras'),

      ('estoque', 'estoque'),
      ('estoque_movimentacoes', 'estoque'),
      ('inventarios', 'estoque'),
      ('inventario_itens', 'estoque'),

      ('produtos', 'catalogo'),
      ('fornecedores', 'catalogo'),
      ('catalogo_produtos', 'catalogo'),
      ('catalogo_importacoes', 'catalogo'),
      ('ia_comercial_historico', 'catalogo'),

      ('orcamentos', 'orcamentos'),
      ('orcamento_itens', 'orcamentos'),
      ('orcamento_historico', 'orcamentos'),

      ('ordens_producao', 'pcp'),
      ('ordem_producao_apontamentos', 'pcp'),
      ('ordem_producao_custos', 'pcp'),
      ('ordem_producao_historico', 'pcp'),
      ('ordem_producao_materiais', 'pcp'),
      ('ordem_producao_recursos', 'pcp'),
      ('recursos_producao', 'pcp'),
      ('recurso_producao_indisponibilidades', 'pcp'),

      ('empresa_configuracoes_tributarias', 'tributario'),
      ('empresa_regras_tributarias', 'tributario'),
      ('empresa_alertas_tributarios', 'tributario'),
      ('empresa_verificacoes_tributarias', 'tributario'),
      ('empresa_notas_fiscais_tributarias', 'tributario')
    ) as m(tabela, modulo)
  loop
    if to_regclass(format('public.%I', r.tabela)) is null then
      raise exception 'Preflight: tabela operacional ausente: %', r.tabela;
    end if;

    execute format('drop policy if exists comercial_modulo_v1 on public.%I', r.tabela);
    execute format(
      'create policy comercial_modulo_v1 on public.%I as restrictive for all to authenticated using ((select public.usuario_tem_modulo(%L))) with check ((select public.usuario_tem_modulo(%L)))',
      r.tabela, r.modulo, r.modulo
    );
  end loop;
end;
$$;

-- Clientes são compartilhados por fluxos que realmente os utilizam. Qualquer
-- módulo aceito continua sujeito ao isolamento por empresa já existente.
drop policy if exists comercial_modulo_v1 on public.clientes;
create policy comercial_modulo_v1
on public.clientes as restrictive for all to authenticated
using ((select
  public.usuario_tem_modulo('crm')
  or public.usuario_tem_modulo('vendas')
  or public.usuario_tem_modulo('financeiro')
  or public.usuario_tem_modulo('orcamentos')
))
with check ((select
  public.usuario_tem_modulo('crm')
  or public.usuario_tem_modulo('vendas')
  or public.usuario_tem_modulo('financeiro')
  or public.usuario_tem_modulo('orcamentos')
));

-- Categorias e recorrências contêm registros pessoais e empresariais na mesma
-- tabela; o proprietário/escopo escolhe o módulo exigido sem retirar o RLS atual.
drop policy if exists comercial_modulo_v1 on public.financeiro_categorias;
create policy comercial_modulo_v1
on public.financeiro_categorias as restrictive for all to authenticated
using ((select case
  when proprietario_id is null then public.usuario_tem_modulo('financeiro')
  else public.usuario_tem_modulo('financas_pessoais')
end))
with check ((select case
  when proprietario_id is null then public.usuario_tem_modulo('financeiro')
  else public.usuario_tem_modulo('financas_pessoais')
end));

drop policy if exists comercial_modulo_v1 on public.financeiro_recorrencias;
create policy comercial_modulo_v1
on public.financeiro_recorrencias as restrictive for all to authenticated
using ((select case
  when escopo = 'Pessoal' then public.usuario_tem_modulo('financas_pessoais')
  when escopo = 'Empresarial' then public.usuario_tem_modulo('financeiro')
  else false
end))
with check ((select case
  when escopo = 'Pessoal' then public.usuario_tem_modulo('financas_pessoais')
  when escopo = 'Empresarial' then public.usuario_tem_modulo('financeiro')
  else false
end));

-- As RPCs abaixo eram SECURITY DEFINER. Seus corpos já validam empresa e
-- usuário; os wrappers acrescentam o módulo antes de chamar a implementação
-- original, que deixa de ser executável diretamente por clientes.

alter function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text,uuid)
  rename to baixar_titulo_financeiro_interno_v1;
revoke all on function public.baixar_titulo_financeiro_interno_v1(uuid,uuid,numeric,date,text,text,text,uuid) from public, anon, authenticated;
create function public.baixar_titulo_financeiro(p_titulo_id uuid,p_empresa_id uuid,p_valor numeric,p_data date,p_forma text,p_conta text,p_observacoes text,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.baixar_titulo_financeiro_interno_v1(p_titulo_id,p_empresa_id,p_valor,p_data,p_forma,p_conta,p_observacoes,p_idempotency_key);
end $$;

alter function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text,uuid)
  rename to conciliar_titulo_financeiro_interno_v1;
revoke all on function public.conciliar_titulo_financeiro_interno_v1(uuid,uuid,text,date,numeric,text,text,uuid) from public, anon, authenticated;
create function public.conciliar_titulo_financeiro(p_titulo_id uuid,p_empresa_id uuid,p_conta text,p_data date,p_valor numeric,p_status text,p_observacoes text,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.conciliar_titulo_financeiro_interno_v1(p_titulo_id,p_empresa_id,p_conta,p_data,p_valor,p_status,p_observacoes,p_idempotency_key);
end $$;

alter function public.confirmar_recebimento(uuid,uuid,uuid)
  rename to confirmar_recebimento_interno_v1;
revoke all on function public.confirmar_recebimento_interno_v1(uuid,uuid,uuid) from public, anon, authenticated;
create function public.confirmar_recebimento(p_recebimento_id uuid,p_empresa_id uuid,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.confirmar_recebimento_interno_v1(p_recebimento_id,p_empresa_id,p_idempotency_key);
end $$;

alter function public.editar_titulo_financeiro(uuid,uuid,text,text,text,text,text,date,text)
  rename to editar_titulo_financeiro_interno_v1;
revoke all on function public.editar_titulo_financeiro_interno_v1(uuid,uuid,text,text,text,text,text,date,text) from public, anon, authenticated;
create function public.editar_titulo_financeiro(p_titulo_id uuid,p_empresa_id uuid,p_contraparte_nome text,p_referencia text,p_descricao text,p_categoria text,p_centro_custo text,p_vencimento date,p_observacoes text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  perform public.editar_titulo_financeiro_interno_v1(p_titulo_id,p_empresa_id,p_contraparte_nome,p_referencia,p_descricao,p_categoria,p_centro_custo,p_vencimento,p_observacoes);
end $$;

alter function public.estornar_baixa_financeira(uuid,uuid,date,text)
  rename to estornar_baixa_financeira_interno_v1;
revoke all on function public.estornar_baixa_financeira_interno_v1(uuid,uuid,date,text) from public, anon, authenticated;
create function public.estornar_baixa_financeira(p_baixa_id uuid,p_empresa_id uuid,p_data date,p_observacoes text default null)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.estornar_baixa_financeira_interno_v1(p_baixa_id,p_empresa_id,p_data,p_observacoes);
end $$;

alter function public.registrar_titulo_financeiro(uuid,text,text,text,text,text,text,date,numeric,text,text,text,text)
  rename to registrar_titulo_financeiro_interno_v1;
revoke all on function public.registrar_titulo_financeiro_interno_v1(uuid,text,text,text,text,text,text,date,numeric,text,text,text,text) from public, anon, authenticated;
create function public.registrar_titulo_financeiro(p_empresa_id uuid,p_tipo text,p_contraparte_nome text,p_origem text,p_origem_id text,p_referencia text,p_descricao text,p_vencimento date,p_valor numeric,p_contraparte_id text default null,p_categoria text default null,p_centro_custo text default null,p_observacoes text default null)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.registrar_titulo_financeiro_interno_v1(p_empresa_id,p_tipo,p_contraparte_nome,p_origem,p_origem_id,p_referencia,p_descricao,p_vencimento,p_valor,p_contraparte_id,p_categoria,p_centro_custo,p_observacoes);
end $$;

revoke all on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text,uuid) from public, anon;
revoke all on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text,uuid) from public, anon;
revoke all on function public.confirmar_recebimento(uuid,uuid,uuid) from public, anon;
revoke all on function public.editar_titulo_financeiro(uuid,uuid,text,text,text,text,text,date,text) from public, anon;
revoke all on function public.estornar_baixa_financeira(uuid,uuid,date,text) from public, anon;
revoke all on function public.registrar_titulo_financeiro(uuid,text,text,text,text,text,text,date,numeric,text,text,text,text) from public, anon;

grant execute on function public.baixar_titulo_financeiro(uuid,uuid,numeric,date,text,text,text,uuid) to authenticated;
grant execute on function public.conciliar_titulo_financeiro(uuid,uuid,text,date,numeric,text,text,uuid) to authenticated;
grant execute on function public.confirmar_recebimento(uuid,uuid,uuid) to authenticated;
grant execute on function public.editar_titulo_financeiro(uuid,uuid,text,text,text,text,text,date,text) to authenticated;
grant execute on function public.estornar_baixa_financeira(uuid,uuid,date,text) to authenticated;
grant execute on function public.registrar_titulo_financeiro(uuid,text,text,text,text,text,text,date,numeric,text,text,text,text) to authenticated;

commit;
