begin;

-- BASELINE ESTRUTURAL OPERACIONAL - HOMOLOGACAO
-- Alvo exclusivo de revisao futura: cunhacontrol-homolog
-- Project ref esperado: toiehtfotpjwjslpwdff
-- Referencia somente de schema: cunhacontrol / leissgrymkxakjvurric
--
-- ZERO DADOS: este arquivo nao contem INSERT, COPY, UPDATE, DELETE, MERGE,
-- dados de Auth, objetos de auth/storage, secrets, tokens ou tabelas _cf_*.
-- Nao executar sem confirmar externamente o project ref acima e concluir
-- integralmente o preflight fail-closed abaixo.

do $preflight$
declare
  unexpected text;
begin
  if to_regprocedure('extensions.uuid_generate_v4()') is null
     or to_regprocedure('gen_random_uuid()') is null then
    raise exception 'Preflight: extensoes UUID requeridas estao ausentes.';
  end if;

  if to_regclass('public.empresas') is null
     or to_regclass('public.usuarios') is null
     or to_regclass('public.planos') is null
     or to_regclass('public.plano_modulos') is null
     or to_regclass('public.empresa_modulos') is null then
    raise exception 'Preflight: reconciliacao minima anterior ausente.';
  end if;

  if (select count(*) from public.empresas) <> 3
     or (select count(*) from public.usuarios) <> 4
     or (select count(*) from public.usuarios where master_admin is true) <> 1 then
    raise exception 'Preflight: fingerprint nominal da homologacao divergiu.';
  end if;

  if not exists (
    select 1 from public.usuarios
    where id = '5240b611-77e1-4dc6-85c4-2d379583ade8'::uuid
      and status = 'ATIVO'
      and master_admin is true
      and empresa_id is null
  ) then
    raise exception 'Preflight: perfil do Master Admin divergiu.';
  end if;

  if not exists (
    select 1 from public.usuarios
    where id = 'a1111111-1111-4111-8111-111111111111'::uuid
      and empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      and status = 'ATIVO' and master_admin is false
  ) or not exists (
    select 1 from public.usuarios
    where id = 'a2222222-2222-4222-8222-222222222222'::uuid
      and empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      and status = 'ATIVO' and master_admin is false
  ) or not exists (
    select 1 from public.usuarios
    where id = 'b1111111-1111-4111-8111-111111111111'::uuid
      and empresa_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
      and status = 'ATIVO' and master_admin is false
  ) then
    raise exception 'Preflight: vinculos A1/A2/B1 divergiram.';
  end if;

  if not exists (
    select 1 from public.empresas
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid and status = 'ATIVO'
  ) or not exists (
    select 1 from public.empresas
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid and status = 'ATIVO'
  ) or not exists (
    select 1 from public.empresas
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
      and status is null and user_id is null
  ) or exists (
    select 1 from public.usuarios
    where empresa_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
  ) then
    raise exception 'Preflight: empresas sinteticas A/B/C divergiram.';
  end if;

  if (select count(*) from public.planos) <> 0
     or (select count(*) from public.plano_modulos) <> 0
     or (select count(*) from public.empresa_modulos) <> 0 then
    raise exception 'Preflight: planos/modulos deixaram de estar vazios.';
  end if;

  select string_agg(v.name, ', ' order by v.name)
  into unexpected
  from (values
    ('assinaturas'),('catalogo_importacoes'),('catalogo_produtos'),('categorias'),
    ('clientes'),('compras'),('configuracoes'),('contas'),('contas_pagar'),
    ('crm_oportunidade_historico'),('crm_oportunidades'),('empresa_alertas_tributarios'),
    ('empresa_configuracoes_tributarias'),('empresa_nota_fiscal_analises'),
    ('empresa_nota_fiscal_itens'),('empresa_notas_fiscais_tributarias'),
    ('empresa_regras_tributarias'),('empresa_verificacoes_tributarias'),('emprestimos'),
    ('estoque'),('estoque_movimentacoes'),('financeiro_baixas'),
    ('financeiro_categorias'),('financeiro_conciliacoes'),('financeiro_historico'),
    ('financeiro_recorrencias'),('financeiro_titulos'),('fornecedores'),
    ('ia_comercial_historico'),('inventario_itens'),('inventarios'),('lancamentos'),
    ('lancamentos_pessoais'),('orcamento_aprovacoes'),('orcamento_historico'),
    ('orcamento_itens'),('orcamentos'),('orcamentos_pessoais_mensais'),
    ('ordem_producao_apontamentos'),('ordem_producao_custos'),
    ('ordem_producao_historico'),('ordem_producao_materiais'),
    ('ordem_producao_operacao_apontamentos'),('ordem_producao_operacao_resultados'),
    ('ordem_producao_recursos'),('ordens_producao'),('parcelas'),
    ('pedido_compra_cotacoes'),('pedido_compra_followups'),('pedido_compra_historico'),
    ('pedido_compra_itens'),('pedido_compra_parcelas'),('pedidos_compra'),('produtos'),
    ('prospeccao_interacoes'),('prospeccao_prospectos'),('recebimentos'),
    ('recurso_producao_indisponibilidades'),('recursos_producao'),('vendas')
  ) as v(name)
  where to_regclass('public.' || v.name) is not null;

  if unexpected is not null then
    raise exception 'Preflight: objetos operacionais inesperados ja existem: %', unexpected;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and (
      (table_name = 'empresas' and column_name in
        ('is_admin','tipo_sistema','email','isento','cpf','whatsapp','pix_chave','pagou','mes_pagamento','pix','valor'))
      or (table_name = 'usuarios' and column_name in
        ('isento','pix_chave','cpf','whatsapp','pix','nivel','pode_financeiro','pode_emprestimos',
         'pode_compras','pode_vendas','pode_contas_pagar','financeiro','emprestimos','vendas','compras','contas_pagar'))
      or (table_name = 'contas_pagar_pessoais' and column_name in
        ('categoria_id','recorrencia_id','competencia','classificacao_financeira'))
      or (table_name = 'despesas' and column_name in
        ('categoria_id','classificacao_financeira'))
    )
  ) then
    raise exception 'Preflight: reconciliacao estrutural parcial detectada nas tabelas preservadas.';
  end if;
  -- Fail-closed para objetos que esta migration pretende criar/substituir.
  -- Estado esperado nesta baseline: todos ausentes; qualquer colisao e inesperada.
  select string_agg(v.signature, ', ' order by v.signature)
  into unexpected
  from (values
    ('public.usuario_eh_master()'),
    ('public.alterar_status_pedido_compra(uuid, uuid, uuid, text)'),
    ('public.apontar_resultado_operacao_producao(uuid, uuid, numeric, numeric, text, text, timestamp with time zone, text, uuid)'),
    ('public.atualizar_pedido_compra_completo(uuid, uuid, uuid, jsonb, jsonb)'),
    ('public.baixar_reserva_estoque(uuid, uuid, numeric, text, text)'),
    ('public.baixar_titulo_financeiro(uuid, uuid, numeric, date, text, text, text)'),
    ('public.baixar_titulo_financeiro(uuid, uuid, numeric, date, text, text, text, uuid)'),
    ('public.baixar_titulo_financeiro_interno_v1(uuid, uuid, numeric, date, text, text, text, uuid)'),
    ('public.cf_pode_alterar_tributario(uuid)'),
    ('public.conciliar_titulo_financeiro(uuid, uuid, text, date, numeric, text, text)'),
    ('public.conciliar_titulo_financeiro(uuid, uuid, text, date, numeric, text, text, uuid)'),
    ('public.conciliar_titulo_financeiro_interno_v1(uuid, uuid, text, date, numeric, text, text, uuid)'),
    ('public.confirmar_recebimento(uuid, uuid, uuid)'),
    ('public.confirmar_recebimento_interno_v1(uuid, uuid, uuid)'),
    ('public.consumir_material_producao(uuid, uuid, numeric)'),
    ('public.contas_pagar_pessoais_set_atualizado_em()'),
    ('public.converter_prospecto_comercial(uuid)'),
    ('public.criar_pedido_compra_completo(uuid, uuid, jsonb, jsonb)'),
    ('public.crm_protect_opportunity_scope()'),
    ('public.crm_set_updated_at()'),
    ('public.editar_titulo_financeiro(uuid, uuid, text, text, text, text, text, date, text)'),
    ('public.editar_titulo_financeiro_interno_v1(uuid, uuid, text, text, text, text, text, date, text)'),
    ('public.entrar_produto_acabado(uuid, uuid, uuid, numeric)'),
    ('public.estornar_baixa_financeira(uuid, uuid, date, text)'),
    ('public.estornar_baixa_financeira_interno_v1(uuid, uuid, date, text)'),
    ('public.excluir_nota_fiscal_tributaria(uuid, uuid)'),
    ('public.finalizar_inventario(uuid, uuid)'),
    ('public.financeiro_planejamento_set_atualizado_em()'),
    ('public.gerar_titulos_recorrentes(date, uuid)'),
    ('public.importar_nota_fiscal_tributaria(uuid, jsonb, jsonb, jsonb)'),
    ('public.liberar_material_producao(uuid, uuid, numeric)'),
    ('public.materializar_despesa_evento_entrada_pessoal(uuid, uuid, uuid)'),
    ('public.movimentar_estoque(uuid, uuid, text, numeric, text, text, text, text, uuid)'),
    ('public.proteger_autoria_revisao_tributaria()'),
    ('public.proteger_campos_autorizacao_usuario()'),
    ('public.proteger_conteudo_alerta_tributario()'),
    ('public.proteger_historico_configuracao_tributaria()'),
    ('public.receber_item_pedido(uuid, uuid, numeric)'),
    ('public.receber_item_pedido(uuid, uuid, numeric, uuid)'),
    ('public.registrar_configuracao_tributaria(uuid, text, text, date, date, text)'),
    ('public.registrar_decisao_orcamento(uuid, uuid, text, text)'),
    ('public.registrar_evento_operacao_producao(uuid, uuid, text, timestamp with time zone, text, uuid)'),
    ('public.registrar_titulo_financeiro(uuid, text, text, text, text, text, text, date, numeric, text, text, text, text)'),
    ('public.registrar_titulo_financeiro_interno_v1(uuid, text, text, text, text, text, text, date, numeric, text, text, text, text)'),
    ('public.registrar_verificacao_tributaria(uuid)'),
    ('public.reordenar_fila_producao(uuid, uuid, uuid[])'),
    ('public.reservar_material_producao(uuid, uuid, numeric)'),
    ('public.reverter_consumo_producao(uuid, uuid, uuid)'),
    ('public.revisar_nota_fiscal_tributaria(uuid, uuid)'),
    ('public.salvar_cotacao_pedido_compra(uuid, uuid, uuid, uuid, jsonb)'),
    ('public.sincronizar_parcelas_pedido_compra(uuid, uuid, uuid, jsonb)'),
    ('public.usuario_tem_modulo(text)'),
    ('public.validar_escopo_categoria_financeira()'),
    ('public.validar_escopo_recorrencia_financeira()')
  ) as v(signature)
  where to_regprocedure(v.signature) is not null;

  if unexpected is not null then
    raise exception 'Preflight: funcoes inesperadas com mesma assinatura ja existem: %', unexpected;
  end if;

  select string_agg(v.name, ', ' order by v.name)
  into unexpected
  from (values
    ('relatorio_anual'),
    ('relatorio_mensal')
  ) as v(name)
  where to_regclass('public.' || v.name) is not null;

  if unexpected is not null then
    raise exception 'Preflight: views inesperadas ja existem: %', unexpected;
  end if;

  select string_agg(v.table_name || '.' || v.trigger_name, ', ' order by v.table_name, v.trigger_name)
  into unexpected
  from (values
    ('crm_oportunidades', 'crm_oportunidades_protect_scope'),
    ('crm_oportunidades', 'crm_oportunidades_set_updated_at'),
    ('empresa_alertas_tributarios', 'proteger_conteudo_alerta_tributario'),
    ('empresa_configuracoes_tributarias', 'proteger_historico_configuracao_tributaria'),
    ('empresa_notas_fiscais_tributarias', 'proteger_autoria_revisao_tributaria'),
    ('financeiro_categorias', 'financeiro_categorias_set_atualizado_em'),
    ('financeiro_recorrencias', 'financeiro_recorrencias_set_atualizado_em'),
    ('financeiro_recorrencias', 'recorrencia_validar_categoria'),
    ('financeiro_titulos', 'financeiro_titulos_validar_recorrencia'),
    ('orcamentos_pessoais_mensais', 'orcamento_pessoal_validar_categoria'),
    ('orcamentos_pessoais_mensais', 'orcamentos_pessoais_set_atualizado_em'),
    ('contas_pagar_pessoais', 'contas_pagar_pessoais_set_atualizado_em'),
    ('contas_pagar_pessoais', 'cpp_validar_categoria'),
    ('contas_pagar_pessoais', 'cpp_validar_recorrencia'),
    ('despesas', 'despesas_validar_categoria'),
    ('usuarios', 'usuarios_proteger_campos_autorizacao')
  ) as v(table_name, trigger_name)
  join pg_namespace n on n.nspname = 'public'
  join pg_class c on c.relnamespace = n.oid and c.relname = v.table_name
  join pg_trigger t on t.tgrelid = c.oid and t.tgname = v.trigger_name
  where not t.tgisinternal;

  if unexpected is not null then
    raise exception 'Preflight: triggers inesperados ja existem: %', unexpected;
  end if;

  select string_agg(v.table_name || '.' || v.policy_name, ', ' order by v.table_name, v.policy_name)
  into unexpected
  from (values
    ('catalogo_importacoes', 'catalogo_importacoes_tenant'),
    ('catalogo_importacoes', 'comercial_modulo_v1'),
    ('catalogo_produtos', 'catalogo_produtos_tenant'),
    ('catalogo_produtos', 'comercial_modulo_v1'),
    ('categorias', 'liberar leitura categorias'),
    ('categorias', 'liberar_select_categorias'),
    ('clientes', 'clientes_empresa_v1'),
    ('clientes', 'comercial_modulo_v1'),
    ('compras', 'comercial_modulo_v1'),
    ('compras', 'compras_empresa_v1'),
    ('configuracoes', 'configuracoes_read_authenticated'),
    ('contas', 'Contas do usuario'),
    ('contas_pagar', 'comercial_modulo_v1'),
    ('contas_pagar', 'contas_pagar_delete_empresa_v2'),
    ('contas_pagar', 'contas_pagar_insert_empresa_v2'),
    ('contas_pagar', 'contas_pagar_select_empresa_v2'),
    ('contas_pagar', 'contas_pagar_update_empresa_v2'),
    ('crm_oportunidade_historico', 'comercial_modulo_v1'),
    ('crm_oportunidade_historico', 'crm_historico_insert_tenant'),
    ('crm_oportunidade_historico', 'crm_historico_select_tenant'),
    ('crm_oportunidades', 'comercial_modulo_v1'),
    ('crm_oportunidades', 'crm_oportunidades_delete_tenant'),
    ('crm_oportunidades', 'crm_oportunidades_insert_tenant'),
    ('crm_oportunidades', 'crm_oportunidades_select_tenant'),
    ('crm_oportunidades', 'crm_oportunidades_update_tenant'),
    ('empresa_alertas_tributarios', 'alertas tributarios: cadastro por responsavel'),
    ('empresa_alertas_tributarios', 'alertas tributarios: leitura da empresa'),
    ('empresa_alertas_tributarios', 'alertas tributarios: resolucao por responsavel'),
    ('empresa_alertas_tributarios', 'comercial_modulo_v1'),
    ('empresa_configuracoes_tributarias', 'config tributaria: encerramento por responsavel'),
    ('empresa_configuracoes_tributarias', 'config tributaria: insercao por responsavel'),
    ('empresa_configuracoes_tributarias', 'config tributaria: leitura da empresa'),
    ('empresa_configuracoes_tributarias', 'comercial_modulo_v1'),
    ('empresa_nota_fiscal_analises', 'empresa_nota_fiscal_analises_insert_responsavel'),
    ('empresa_nota_fiscal_analises', 'empresa_nota_fiscal_analises_select'),
    ('empresa_nota_fiscal_itens', 'empresa_nota_fiscal_itens_insert_responsavel'),
    ('empresa_nota_fiscal_itens', 'empresa_nota_fiscal_itens_select'),
    ('empresa_notas_fiscais_tributarias', 'comercial_modulo_v1'),
    ('empresa_notas_fiscais_tributarias', 'empresa_notas_fiscais_delete_responsavel'),
    ('empresa_notas_fiscais_tributarias', 'empresa_notas_fiscais_insert_responsavel'),
    ('empresa_notas_fiscais_tributarias', 'empresa_notas_fiscais_select'),
    ('empresa_notas_fiscais_tributarias', 'empresa_notas_fiscais_update_responsavel'),
    ('empresa_regras_tributarias', 'regras tributarias: cadastro por responsavel'),
    ('empresa_regras_tributarias', 'regras tributarias: leitura da empresa'),
    ('empresa_regras_tributarias', 'comercial_modulo_v1'),
    ('empresa_verificacoes_tributarias', 'verificacao tributaria: atualizacao por responsavel'),
    ('empresa_verificacoes_tributarias', 'verificacao tributaria: cadastro por responsavel'),
    ('empresa_verificacoes_tributarias', 'verificacao tributaria: leitura da empresa'),
    ('empresa_verificacoes_tributarias', 'comercial_modulo_v1'),
    ('emprestimos', 'comercial_modulo_v1'),
    ('emprestimos', 'emprestimos_empresa_authenticated'),
    ('estoque', 'comercial_modulo_v1'),
    ('estoque', 'estoque_empresa'),
    ('estoque_movimentacoes', 'comercial_modulo_v1'),
    ('estoque_movimentacoes', 'estoque_mov_insert'),
    ('estoque_movimentacoes', 'estoque_mov_select'),
    ('financeiro_baixas', 'comercial_modulo_v1'),
    ('financeiro_baixas', 'financeiro_baixas_select_empresa'),
    ('financeiro_categorias', 'categorias_delete_escopo'),
    ('financeiro_categorias', 'categorias_insert_escopo'),
    ('financeiro_categorias', 'categorias_select_escopo'),
    ('financeiro_categorias', 'categorias_update_escopo'),
    ('financeiro_categorias', 'comercial_modulo_v1'),
    ('financeiro_conciliacoes', 'comercial_modulo_v1'),
    ('financeiro_conciliacoes', 'financeiro_conciliacoes_empresa'),
    ('financeiro_conciliacoes', 'financeiro_conciliacoes_insert_empresa'),
    ('financeiro_conciliacoes', 'financeiro_conciliacoes_update_empresa'),
    ('financeiro_historico', 'comercial_modulo_v1'),
    ('financeiro_historico', 'financeiro_historico_select_empresa'),
    ('financeiro_recorrencias', 'comercial_modulo_v1'),
    ('financeiro_recorrencias', 'recorrencias_delete_escopo'),
    ('financeiro_recorrencias', 'recorrencias_insert_escopo'),
    ('financeiro_recorrencias', 'recorrencias_select_escopo'),
    ('financeiro_recorrencias', 'recorrencias_update_escopo'),
    ('financeiro_titulos', 'comercial_modulo_v1'),
    ('financeiro_titulos', 'financeiro_titulos_insert_empresa'),
    ('financeiro_titulos', 'financeiro_titulos_select_empresa'),
    ('financeiro_titulos', 'financeiro_titulos_update_empresa'),
    ('fornecedores', 'comercial_modulo_v1'),
    ('fornecedores', 'fornecedores_empresa_v1'),
    ('ia_comercial_historico', 'comercial_modulo_v1'),
    ('ia_comercial_historico', 'ia_comercial_historico_tenant'),
    ('inventario_itens', 'comercial_modulo_v1'),
    ('inventario_itens', 'inventario_itens_empresa'),
    ('inventarios', 'comercial_modulo_v1'),
    ('inventarios', 'inventarios_insert_empresa'),
    ('inventarios', 'inventarios_select_empresa'),
    ('inventarios', 'inventarios_update_empresa'),
    ('lancamentos', 'comercial_modulo_v1'),
    ('lancamentos', 'lancamentos_empresa_v1'),
    ('lancamentos_pessoais', 'Atualizar meus lancamentos pessoais'),
    ('lancamentos_pessoais', 'Excluir meus lancamentos pessoais'),
    ('lancamentos_pessoais', 'Inserir meus lancamentos pessoais'),
    ('lancamentos_pessoais', 'Ver meus lancamentos pessoais'),
    ('orcamento_aprovacoes', 'orcamento_aprovacoes_insert_empresa'),
    ('orcamento_aprovacoes', 'orcamento_aprovacoes_select_empresa'),
    ('orcamento_historico', 'comercial_modulo_v1'),
    ('orcamento_historico', 'orcamento_historico_insert_empresa'),
    ('orcamento_historico', 'orcamento_historico_select_empresa'),
    ('orcamento_itens', 'comercial_modulo_v1'),
    ('orcamento_itens', 'orcamento_itens_empresa'),
    ('orcamentos', 'comercial_modulo_v1'),
    ('orcamentos', 'orcamentos_insert_empresa'),
    ('orcamentos', 'orcamentos_select_empresa'),
    ('orcamentos', 'orcamentos_update_empresa'),
    ('orcamentos_pessoais_mensais', 'comercial_modulo_v1'),
    ('orcamentos_pessoais_mensais', 'orcamentos_pessoais_delete_owner'),
    ('orcamentos_pessoais_mensais', 'orcamentos_pessoais_insert_owner'),
    ('orcamentos_pessoais_mensais', 'orcamentos_pessoais_select_owner'),
    ('orcamentos_pessoais_mensais', 'orcamentos_pessoais_update_owner'),
    ('ordem_producao_apontamentos', 'comercial_modulo_v1'),
    ('ordem_producao_apontamentos', 'ordem_apontamentos_insert'),
    ('ordem_producao_apontamentos', 'ordem_apontamentos_select'),
    ('ordem_producao_custos', 'comercial_modulo_v1'),
    ('ordem_producao_custos', 'ordem_producao_custos_insert_empresa'),
    ('ordem_producao_custos', 'ordem_producao_custos_select_empresa'),
    ('ordem_producao_custos', 'ordem_producao_custos_update_empresa'),
    ('ordem_producao_historico', 'comercial_modulo_v1'),
    ('ordem_producao_historico', 'ordem_historico_insert'),
    ('ordem_producao_historico', 'ordem_historico_select'),
    ('ordem_producao_materiais', 'comercial_modulo_v1'),
    ('ordem_producao_materiais', 'ordem_materiais_empresa'),
    ('ordem_producao_operacao_apontamentos', 'operacao_apontamentos_insert_empresa'),
    ('ordem_producao_operacao_apontamentos', 'operacao_apontamentos_select_empresa'),
    ('ordem_producao_operacao_resultados', 'operacao_resultados_insert_empresa'),
    ('ordem_producao_operacao_resultados', 'operacao_resultados_select_empresa'),
    ('ordem_producao_recursos', 'comercial_modulo_v1'),
    ('ordem_producao_recursos', 'ordem_recursos_empresa'),
    ('ordem_producao_recursos', 'ordem_recursos_insert_empresa'),
    ('ordem_producao_recursos', 'ordem_recursos_update_empresa'),
    ('ordens_producao', 'comercial_modulo_v1'),
    ('ordens_producao', 'ordens_producao_insert_empresa'),
    ('ordens_producao', 'ordens_producao_select_empresa'),
    ('ordens_producao', 'ordens_producao_update_empresa'),
    ('parcelas', 'comercial_modulo_v1'),
    ('parcelas', 'parcelas_empresa_authenticated'),
    ('pedido_compra_cotacoes', 'pedido_cotacoes_empresa'),
    ('pedido_compra_followups', 'comercial_modulo_v1'),
    ('pedido_compra_followups', 'pedido_followups_insert_empresa'),
    ('pedido_compra_followups', 'pedido_followups_select_empresa'),
    ('pedido_compra_historico', 'comercial_modulo_v1'),
    ('pedido_compra_historico', 'pedido_historico_insert'),
    ('pedido_compra_historico', 'pedido_historico_select'),
    ('pedido_compra_itens', 'pedido_itens_empresa'),
    ('pedido_compra_parcelas', 'comercial_modulo_v1'),
    ('pedido_compra_parcelas', 'pedido_parcelas_empresa'),
    ('pedidos_compra', 'comercial_modulo_v1'),
    ('pedidos_compra', 'pedidos_compra_empresa'),
    ('pedidos_compra', 'pedidos_compra_insert_empresa'),
    ('pedidos_compra', 'pedidos_compra_update_empresa'),
    ('produtos', 'comercial_modulo_v1'),
    ('produtos', 'produtos_empresa'),
    ('prospeccao_interacoes', 'comercial_modulo_v1'),
    ('prospeccao_interacoes', 'prospeccao_interacoes_insert_tenant'),
    ('prospeccao_interacoes', 'prospeccao_interacoes_select_tenant'),
    ('prospeccao_prospectos', 'comercial_modulo_v1'),
    ('prospeccao_prospectos', 'prospeccao_prospectos_delete_tenant'),
    ('prospeccao_prospectos', 'prospeccao_prospectos_insert_tenant'),
    ('prospeccao_prospectos', 'prospeccao_prospectos_select_tenant'),
    ('prospeccao_prospectos', 'prospeccao_prospectos_update_tenant'),
    ('recebimentos', 'comercial_modulo_v1'),
    ('recebimentos', 'recebimentos_empresa_authenticated'),
    ('recurso_producao_indisponibilidades', 'comercial_modulo_v1'),
    ('recurso_producao_indisponibilidades', 'recurso_indisponibilidades_empresa'),
    ('recurso_producao_indisponibilidades', 'recurso_indisponibilidades_insert_empresa'),
    ('recurso_producao_indisponibilidades', 'recurso_indisponibilidades_update_empresa'),
    ('recursos_producao', 'comercial_modulo_v1'),
    ('recursos_producao', 'recursos_producao_empresa'),
    ('recursos_producao', 'recursos_producao_insert_empresa'),
    ('recursos_producao', 'recursos_producao_update_empresa'),
    ('vendas', 'comercial_modulo_v1'),
    ('vendas', 'vendas_empresa_v1')
  ) as v(table_name, policy_name)
  join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = v.table_name
   and p.policyname = v.policy_name;

  if unexpected is not null then
    raise exception 'Preflight: policies inesperadas ja existem: %', unexpected;
  end if;

end
$preflight$;

-- Objetos reconciliados sao preservados; somente colunas finais ausentes e
-- requeridas pelo frontend/RPCs sao adicionadas, sempre sem backfill de dados.
alter table public.empresas
  add column is_admin boolean default false,
  add column tipo_sistema text default 'financeiro',
  add column email text,
  add column isento boolean default false,
  add column cpf text,
  add column whatsapp text,
  add column pix_chave text,
  add column pagou boolean default false,
  add column mes_pagamento integer,
  add column pix text,
  add column valor numeric default 0;

alter table public.usuarios
  add column isento boolean default false,
  add column pix_chave text,
  add column cpf text,
  add column whatsapp text,
  add column pix text,
  add column nivel text default 'usuario',
  add column pode_financeiro boolean default false,
  add column pode_emprestimos boolean default false,
  add column pode_compras boolean default false,
  add column pode_vendas boolean default false,
  add column pode_contas_pagar boolean default false,
  add column financeiro boolean default false,
  add column emprestimos boolean default false,
  add column vendas boolean default false,
  add column compras boolean default false,
  add column contas_pagar boolean default false;

alter table public.contas_pagar_pessoais
  add column categoria_id uuid,
  add column recorrencia_id uuid,
  add column competencia date,
  add column classificacao_financeira text;

alter table public.despesas
  add column categoria_id uuid,
  add column classificacao_financeira text;

-- A-J. Tabelas finais ausentes, sem dados.
-- A. Baseline legado ausente.
-- public.clientes
create table public.clientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text,
  email text,
  telefone text,
  cpf text,
  valor_mensal numeric,
  dia_vencimento integer,
  created_at timestamp without time zone DEFAULT now(),
  endereco text,
  empresa_id uuid NOT NULL,
  whatsapp text,
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  ativo boolean DEFAULT true
);

-- public.produtos
create table public.produtos (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  nome text NOT NULL,
  preco numeric(10,2) NOT NULL,
  estoque integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  user_id uuid,
  usuario_id uuid,
  empresa_id uuid NOT NULL,
  tipo_unidade text DEFAULT 'UN'::text,
  data_cadastro date DEFAULT CURRENT_DATE,
  comissao numeric DEFAULT 0.05
);

-- public.fornecedores
create table public.fornecedores (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  nome text,
  telefone text,
  cidade text,
  created_at timestamp without time zone DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  data_cadastro date DEFAULT CURRENT_DATE,
  email text,
  empresa_id uuid NOT NULL
);

-- public.compras
create table public.compras (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  fornecedor text,
  produto_id uuid,
  unidade text,
  preco_compra numeric,
  valor_total numeric,
  created_at timestamp without time zone DEFAULT now(),
  preco numeric,
  user_id uuid,
  comissao numeric DEFAULT 0,
  data_compra date DEFAULT CURRENT_DATE,
  empresa_id uuid,
  kilos numeric,
  material text,
  produto text,
  updated_at timestamp without time zone DEFAULT now(),
  ativo boolean DEFAULT true,
  valor numeric DEFAULT 0,
  valor_por_kg numeric(14,4),
  comissao_por_kg numeric(14,4),
  idempotency_key uuid
);

-- public.vendas
create table public.vendas (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  cliente_id uuid,
  produto_id uuid,
  quantidade integer,
  valor_total numeric(10,2),
  created_at timestamp without time zone DEFAULT now(),
  user_id uuid,
  comissao numeric DEFAULT 0,
  lucro numeric DEFAULT 0,
  preco_unitario numeric DEFAULT 0,
  unidade text DEFAULT 'UN'::text,
  data_venda date DEFAULT CURRENT_DATE,
  empresa_id uuid,
  produto text,
  valor_unitario numeric,
  parcelas integer,
  kilos numeric,
  cliente_nome text,
  updated_at timestamp without time zone DEFAULT now(),
  ativo boolean DEFAULT true,
  valor numeric DEFAULT 0,
  valor_por_kg numeric(14,4),
  comissao_por_kg numeric(14,4),
  idempotency_key uuid
);

-- public.lancamentos
create table public.lancamentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  descricao text,
  valor numeric(12,2) NOT NULL,
  tipo text NOT NULL,
  mes integer,
  ano integer NOT NULL,
  categoria_id uuid,
  conta_id uuid,
  usuario_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  empresa_id uuid,
  user_id uuid,
  data_lancamento date DEFAULT CURRENT_DATE,
  cliente text,
  fornecedor text,
  produto text,
  kilos numeric,
  comissao numeric,
  categoria text,
  data date,
  status text DEFAULT 'pago'::text,
  whatsapp text,
  vencimento date,
  recebimento_id uuid,
  idempotency_key uuid
);

-- public.recebimentos
create table public.recebimentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid,
  venda_id uuid,
  cliente_id uuid,
  valor numeric,
  data_vencimento date,
  status text DEFAULT 'pendente'::text,
  created_at timestamp without time zone DEFAULT now(),
  user_id uuid,
  updated_at timestamp without time zone DEFAULT now(),
  ativo boolean DEFAULT true
);

-- public.contas_pagar
create table public.contas_pagar (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid,
  fornecedor text,
  descricao text,
  valor numeric(12,2),
  vencimento date,
  status text DEFAULT 'Pendente'::text,
  forma_pagamento text,
  observacao text,
  created_at timestamp without time zone DEFAULT now()
);

-- public.parcelas
create table public.parcelas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  venda_id uuid,
  empresa_id uuid,
  valor numeric,
  data_vencimento date,
  status text DEFAULT 'pendente'::text,
  numero_parcela integer,
  cliente_id uuid,
  telefone text
);

-- public.emprestimos
create table public.emprestimos (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  empresa_id uuid,
  cliente text,
  valor numeric,
  total numeric,
  parcelas integer,
  valor_parcela numeric,
  prazo integer,
  data_inicio date DEFAULT now(),
  data_vencimento date,
  status text,
  juros numeric,
  telefone text,
  cpf text,
  endereco text,
  pix_cobranca text,
  user_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  ativo boolean DEFAULT true,
  juros_recebido numeric DEFAULT 0,
  ultimo_pagamento date
);

-- public.categorias
create table public.categorias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  created_at timestamp without time zone DEFAULT now()
);

-- public.contas
create table public.contas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  usuario_id uuid,
  created_at timestamp without time zone DEFAULT now()
);

-- public.configuracoes
create table public.configuracoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  chave text,
  valor text,
  created_at timestamp without time zone DEFAULT now()
);

-- public.assinaturas
create table public.assinaturas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text,
  status text DEFAULT 'pendente'::text,
  payment_id text,
  criado_em timestamp without time zone DEFAULT now()
);

-- public.lancamentos_pessoais
create table public.lancamentos_pessoais (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  data date,
  tipo text,
  categoria text,
  descricao text,
  valor numeric,
  user_id uuid,
  created_at timestamp without time zone DEFAULT now()
);

-- B. CRM.
-- public.crm_oportunidades
create table public.crm_oportunidades (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid,
  cliente_id uuid,
  cliente_nome text,
  empresa_cliente text NOT NULL,
  telefone text,
  whatsapp text,
  email text,
  cidade text,
  estado text,
  pais text,
  origem text,
  segmento text,
  produto_material text,
  quantidade numeric,
  unidade text,
  valor_estimado numeric DEFAULT 0 NOT NULL,
  probabilidade numeric DEFAULT 0 NOT NULL,
  etapa text DEFAULT 'Novo contato'::text NOT NULL,
  prioridade text DEFAULT 'Média'::text NOT NULL,
  responsavel text,
  previsao_fechamento date,
  observacoes text,
  motivo_perda text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.crm_oportunidade_historico
create table public.crm_oportunidade_historico (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  oportunidade_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid,
  tipo text NOT NULL,
  descricao text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- C. Orcamentos.
-- public.orcamentos
create table public.orcamentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  oportunidade_id uuid,
  numero text NOT NULL,
  data date DEFAULT CURRENT_DATE NOT NULL,
  validade date NOT NULL,
  observacoes text,
  observacoes_internas text,
  desconto numeric(12,2) DEFAULT 0 NOT NULL,
  impostos numeric(14,2) DEFAULT 0 NOT NULL,
  comissao numeric(14,2) DEFAULT 0 NOT NULL,
  subtotal numeric(14,2) DEFAULT 0 NOT NULL,
  valor_final numeric(14,2) DEFAULT 0 NOT NULL,
  status text DEFAULT 'Rascunho'::text NOT NULL,
  cliente_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  condicao_pagamento text,
  prazo_entrega text,
  modalidade_frete text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.orcamento_itens
create table public.orcamento_itens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orcamento_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  catalogo_item_id text,
  produto text NOT NULL,
  descricao text,
  liga text,
  tempera text,
  dimensao text,
  peso numeric(14,4) DEFAULT 0 NOT NULL,
  quantidade numeric(14,4) NOT NULL,
  unidade text DEFAULT 'kg'::text NOT NULL,
  preco_unitario numeric(14,4) NOT NULL,
  subtotal numeric(14,2) NOT NULL,
  dados_catalogo jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.orcamento_historico
create table public.orcamento_historico (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orcamento_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.orcamento_aprovacoes
create table public.orcamento_aprovacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orcamento_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  decisao text NOT NULL,
  observacao text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.orcamentos_pessoais_mensais
create table public.orcamentos_pessoais_mensais (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  proprietario_id uuid NOT NULL,
  categoria_id uuid NOT NULL,
  competencia date NOT NULL,
  valor_previsto numeric(14,2) NOT NULL,
  observacoes text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- D. Estoque.
-- public.estoque
create table public.estoque (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  produto_id text,
  codigo text NOT NULL,
  descricao text NOT NULL,
  categoria text,
  liga text,
  tempera text,
  dimensao text,
  peso_unitario numeric(14,4) DEFAULT 0 NOT NULL,
  unidade text DEFAULT 'kg'::text NOT NULL,
  estoque_atual numeric(14,4) DEFAULT 0 NOT NULL,
  estoque_reservado numeric(14,4) DEFAULT 0 NOT NULL,
  estoque_disponivel numeric(14,4) GENERATED ALWAYS AS ((estoque_atual - estoque_reservado)) STORED,
  estoque_minimo numeric(14,4) DEFAULT 0 NOT NULL,
  estoque_maximo numeric(14,4),
  ponto_reposicao numeric(14,4) DEFAULT 0 NOT NULL,
  localizacao text,
  observacoes text,
  custo_unitario numeric(14,4) DEFAULT 0 NOT NULL,
  prazo_reposicao_dias integer DEFAULT 0 NOT NULL,
  ultima_movimentacao_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.estoque_movimentacoes
create table public.estoque_movimentacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  estoque_id uuid NOT NULL,
  produto_id text,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  origem text NOT NULL,
  origem_id text,
  quantidade numeric(14,4) NOT NULL,
  saldo_anterior numeric(14,4) NOT NULL,
  saldo_posterior numeric(14,4) NOT NULL,
  reservado_anterior numeric(14,4) NOT NULL,
  reservado_posterior numeric(14,4) NOT NULL,
  localizacao_origem text,
  localizacao_destino text,
  observacoes text,
  reversao_de uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.inventarios
create table public.inventarios (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  numero text NOT NULL,
  status text DEFAULT 'Em contagem'::text NOT NULL,
  data_inicio timestamp with time zone DEFAULT now() NOT NULL,
  data_conclusao timestamp with time zone,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.inventario_itens
create table public.inventario_itens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventario_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  estoque_id uuid NOT NULL,
  quantidade_sistema numeric(14,4) NOT NULL,
  quantidade_contada numeric(14,4),
  diferenca numeric(14,4) GENERATED ALWAYS AS ((quantidade_contada - quantidade_sistema)) STORED,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- E. Compras inteligentes.
-- public.pedidos_compra
create table public.pedidos_compra (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  fornecedor_id text NOT NULL,
  fornecedor_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  numero text NOT NULL,
  status text DEFAULT 'Rascunho'::text NOT NULL,
  data date DEFAULT CURRENT_DATE NOT NULL,
  previsao date,
  condicao_pagamento text,
  transportadora text,
  frete numeric(14,2) DEFAULT 0 NOT NULL,
  desconto numeric(14,2) DEFAULT 0 NOT NULL,
  observacoes text,
  valor_total numeric(14,2) DEFAULT 0 NOT NULL,
  aprovado_por uuid,
  aprovado_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.pedido_compra_itens
create table public.pedido_compra_itens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  produto_id text NOT NULL,
  estoque_id uuid,
  produto text NOT NULL,
  descricao text,
  liga text,
  tempera text,
  dimensao text,
  peso numeric(14,4) DEFAULT 0 NOT NULL,
  quantidade numeric(14,4) NOT NULL,
  quantidade_recebida numeric(14,4) DEFAULT 0 NOT NULL,
  unidade text DEFAULT 'kg'::text NOT NULL,
  valor_unitario numeric(14,4) NOT NULL,
  subtotal numeric(14,2) NOT NULL,
  comissao numeric(14,2) DEFAULT 0 NOT NULL,
  dados_catalogo jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.pedido_compra_cotacoes
create table public.pedido_compra_cotacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  fornecedor_id text NOT NULL,
  fornecedor_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  valor_total numeric(14,2) NOT NULL,
  prazo_dias integer DEFAULT 0 NOT NULL,
  custo_kg numeric(14,4) DEFAULT 0 NOT NULL,
  observacoes text,
  selecionada boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.pedido_compra_historico
create table public.pedido_compra_historico (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  idempotency_key uuid
);

-- public.pedido_compra_parcelas
create table public.pedido_compra_parcelas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  numero integer NOT NULL,
  vencimento date NOT NULL,
  valor numeric(14,2) NOT NULL,
  status text DEFAULT 'Pendente'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.pedido_compra_followups
create table public.pedido_compra_followups (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  data_prometida date,
  prazo_informado text,
  responsavel_contato text,
  observacoes text,
  contatado_em timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- F. Financeiro corporativo.
-- public.financeiro_titulos
create table public.financeiro_titulos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  contraparte_id text,
  contraparte_nome text NOT NULL,
  origem text NOT NULL,
  origem_id text,
  referencia text,
  descricao text NOT NULL,
  categoria text,
  centro_custo text,
  vencimento date NOT NULL,
  valor_original numeric(14,2) NOT NULL,
  valor_baixado numeric(14,2) DEFAULT 0 NOT NULL,
  saldo numeric(14,2) GENERATED ALWAYS AS ((valor_original - valor_baixado)) STORED,
  status text DEFAULT 'Pendente'::text NOT NULL,
  data_liquidacao date,
  forma_pagamento text,
  conta text,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  recorrencia_id uuid,
  competencia date,
  classificacao_financeira text
);

-- public.financeiro_baixas
create table public.financeiro_baixas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  titulo_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  valor numeric(14,2) NOT NULL,
  valor_baixado_anterior numeric(14,2) NOT NULL,
  valor_baixado_resultante numeric(14,2) NOT NULL,
  saldo_resultante numeric(14,2) NOT NULL,
  data_movimento date DEFAULT CURRENT_DATE NOT NULL,
  forma_pagamento text,
  conta text,
  observacoes text,
  estorno_de uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  idempotency_key uuid
);

-- public.financeiro_conciliacoes
create table public.financeiro_conciliacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  titulo_id uuid,
  baixa_id uuid,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  conta text NOT NULL,
  data_movimento date NOT NULL,
  valor numeric(14,2) NOT NULL,
  status text DEFAULT 'Pendente'::text NOT NULL,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  idempotency_key uuid
);

-- public.financeiro_historico
create table public.financeiro_historico (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  titulo_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  dados jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.financeiro_categorias
create table public.financeiro_categorias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  proprietario_id uuid,
  nome text NOT NULL,
  classificacao text NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- public.financeiro_recorrencias
create table public.financeiro_recorrencias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  proprietario_id uuid,
  escopo text NOT NULL,
  descricao text NOT NULL,
  contraparte text,
  categoria_id uuid,
  classificacao text NOT NULL,
  valor_previsto numeric(14,2) NOT NULL,
  dia_vencimento integer NOT NULL,
  data_inicio date NOT NULL,
  data_fim date,
  frequencia text DEFAULT 'Mensal'::text NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  observacoes text,
  forma_pagamento text,
  conta_financeira text,
  centro_custo text,
  gerar_automaticamente boolean DEFAULT true NOT NULL,
  origem text DEFAULT 'Cadastro recorrente'::text NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- G. PCP.
-- public.ordens_producao
create table public.ordens_producao (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  numero_op text NOT NULL,
  cliente_id text,
  cliente_nome text,
  venda_id text,
  orcamento_id uuid,
  produto_id text,
  produto text NOT NULL,
  descricao text,
  liga text,
  tempera text,
  dimensao text,
  quantidade_planejada numeric(14,4) NOT NULL,
  unidade text DEFAULT 'kg'::text NOT NULL,
  peso_planejado numeric(14,4) DEFAULT 0 NOT NULL,
  peso_produzido numeric(14,4) DEFAULT 0 NOT NULL,
  quantidade_produzida numeric(14,4) DEFAULT 0 NOT NULL,
  quantidade_perdida numeric(14,4) DEFAULT 0 NOT NULL,
  peso_perdido numeric(14,4) DEFAULT 0 NOT NULL,
  data_criacao date DEFAULT CURRENT_DATE NOT NULL,
  data_prevista_inicio date,
  data_prevista_fim date,
  data_inicio_real timestamp with time zone,
  data_fim_real timestamp with time zone,
  prioridade text DEFAULT 'Média'::text NOT NULL,
  status text DEFAULT 'Rascunho'::text NOT NULL,
  responsavel text,
  observacoes text,
  produto_acabado_estoque_id uuid,
  entrada_produto_acabado_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  origem text GENERATED ALWAYS AS (
CASE
    WHEN (venda_id IS NOT NULL) THEN 'Venda'::text
    WHEN (orcamento_id IS NOT NULL) THEN 'Orçamento aprovado'::text
    ELSE 'Manual'::text
END) STORED
);

-- public.ordem_producao_materiais
create table public.ordem_producao_materiais (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ordem_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  estoque_id uuid NOT NULL,
  produto_id text,
  material text NOT NULL,
  quantidade_prevista numeric(14,4) NOT NULL,
  quantidade_reservada numeric(14,4) DEFAULT 0 NOT NULL,
  quantidade_consumida numeric(14,4) DEFAULT 0 NOT NULL,
  unidade text DEFAULT 'kg'::text NOT NULL,
  observacoes text,
  necessidade_compra boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.ordem_producao_apontamentos
create table public.ordem_producao_apontamentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ordem_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  quantidade numeric(14,4) DEFAULT 0 NOT NULL,
  peso numeric(14,4) DEFAULT 0 NOT NULL,
  motivo_perda text,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  ocorrido_em timestamp with time zone DEFAULT now() NOT NULL
);

-- public.ordem_producao_historico
create table public.ordem_producao_historico (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ordem_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  dados jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.ordem_producao_custos
create table public.ordem_producao_custos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ordem_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL,
  data date DEFAULT CURRENT_DATE NOT NULL,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.recursos_producao
create table public.recursos_producao (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  descricao text,
  capacidade_nominal numeric(14,4),
  unidade_capacidade text,
  horas_disponiveis_dia numeric(5,2),
  dias_trabalho smallint[] DEFAULT '{}'::smallint[] NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.ordem_producao_recursos
create table public.ordem_producao_recursos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ordem_id uuid NOT NULL,
  recurso_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  quantidade_planejada numeric(14,4) NOT NULL,
  tempo_unitario_horas numeric(12,4),
  tempo_total_horas numeric(12,4),
  sequencia integer DEFAULT 1 NOT NULL,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  status_operacao text DEFAULT 'Pendente'::text NOT NULL,
  inicio_real timestamp with time zone,
  fim_real timestamp with time zone
);

-- public.recurso_producao_indisponibilidades
create table public.recurso_producao_indisponibilidades (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  recurso_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  inicio date NOT NULL,
  fim date NOT NULL,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.ordem_producao_operacao_apontamentos
create table public.ordem_producao_operacao_apontamentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  alocacao_id uuid NOT NULL,
  ordem_id uuid NOT NULL,
  recurso_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  tipo text NOT NULL,
  ocorrido_em timestamp with time zone NOT NULL,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.ordem_producao_operacao_resultados
create table public.ordem_producao_operacao_resultados (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  alocacao_id uuid NOT NULL,
  ordem_id uuid NOT NULL,
  recurso_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  quantidade_boa numeric(14,4) DEFAULT 0 NOT NULL,
  quantidade_refugada numeric(14,4) DEFAULT 0 NOT NULL,
  operador text NOT NULL,
  motivo_refugo text,
  ocorrido_em timestamp with time zone NOT NULL,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- H. Prospeccao.
-- public.prospeccao_prospectos
create table public.prospeccao_prospectos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid,
  dados jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text DEFAULT 'Novo'::text NOT NULL,
  proximo_retorno_em timestamp with time zone,
  arquivado boolean DEFAULT false NOT NULL,
  convertido_cliente_id uuid,
  convertido_em timestamp with time zone,
  oportunidade_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.prospeccao_interacoes
create table public.prospeccao_interacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  prospecto_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid,
  dados jsonb DEFAULT '{}'::jsonb NOT NULL,
  data_hora timestamp with time zone NOT NULL,
  proximo_retorno_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- I. Catalogo e IA.
-- public.catalogo_produtos
create table public.catalogo_produtos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  categoria text,
  status text DEFAULT 'Ativo'::text NOT NULL,
  dados_tecnicos jsonb DEFAULT '{}'::jsonb NOT NULL,
  dados_comerciais jsonb DEFAULT '{}'::jsonb NOT NULL,
  fornecedor_principal text,
  dados_origem jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.catalogo_importacoes
create table public.catalogo_importacoes (
  id text NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL,
  dados jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.ia_comercial_historico
create table public.ia_comercial_historico (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comando text NOT NULL,
  resultado jsonb DEFAULT '{}'::jsonb NOT NULL,
  atendimento jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- J. Tributario.
-- public.empresa_configuracoes_tributarias
create table public.empresa_configuracoes_tributarias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  regime_base text NOT NULL,
  ibs_cbs_modalidade text NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  observacoes text,
  criado_por uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.empresa_regras_tributarias
create table public.empresa_regras_tributarias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  classificacao text DEFAULT 'ATENCAO'::text NOT NULL,
  fonte_oficial text NOT NULL,
  url_fonte text NOT NULL,
  data_publicacao date NOT NULL,
  inicio_vigencia date NOT NULL,
  ultima_verificacao timestamp with time zone NOT NULL,
  versao text NOT NULL,
  ativa boolean DEFAULT true NOT NULL,
  criado_por uuid DEFAULT auth.uid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.empresa_alertas_tributarios
create table public.empresa_alertas_tributarios (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  chave_alerta text NOT NULL,
  codigo_regra text NOT NULL,
  classificacao text NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  fundamento_fonte text NOT NULL,
  data_regra date NOT NULL,
  resolvido boolean DEFAULT false NOT NULL,
  resolvido_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- public.empresa_notas_fiscais_tributarias
create table public.empresa_notas_fiscais_tributarias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  numero text,
  serie text,
  chave_acesso text,
  data_emissao date,
  tipo_operacao text,
  parte_nome text,
  parte_cnpj text,
  valor_total numeric(18,2),
  frete numeric(18,2),
  icms numeric(18,2),
  ipi numeric(18,2),
  ibs numeric(18,2),
  cbs numeric(18,2),
  observacoes_fiscais text,
  arquivo_nome text NOT NULL,
  arquivo_tipo text NOT NULL,
  origem_leitura text DEFAULT 'analyze-financial-document-v1'::text NOT NULL,
  confianca_extracao numeric(5,4),
  status_tributario text DEFAULT 'pendente_revisao'::text NOT NULL,
  regime_aplicado text,
  modalidade_ibs_cbs text,
  vigencia_inicio_usada date,
  extracao_raw jsonb DEFAULT '{}'::jsonb NOT NULL,
  analisada_em timestamp with time zone,
  revisada_em timestamp with time zone,
  revisada_por uuid,
  integracao_operacional text,
  integrado_em timestamp with time zone,
  criado_por uuid DEFAULT auth.uid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  uf_emitente text,
  uf_destinatario text
);

-- public.empresa_nota_fiscal_itens
create table public.empresa_nota_fiscal_itens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  nota_fiscal_id uuid NOT NULL,
  item_ordem integer NOT NULL,
  descricao text,
  ncm text,
  cfop text,
  quantidade numeric(18,6),
  unidade text,
  peso numeric(18,6),
  valor_unitario numeric(18,6),
  valor_total numeric(18,2),
  icms numeric(18,2),
  ipi numeric(18,2),
  ibs numeric(18,2),
  cbs numeric(18,2),
  confianca_extracao numeric(5,4),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  cst_icms text,
  csosn_icms text
);

-- public.empresa_nota_fiscal_analises
create table public.empresa_nota_fiscal_analises (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa_id uuid NOT NULL,
  nota_fiscal_id uuid NOT NULL,
  status text NOT NULL,
  regime_aplicado text,
  modalidade_ibs_cbs text,
  vigencia_inicio_usada date,
  quantidade_alertas integer DEFAULT 0 NOT NULL,
  alertas jsonb DEFAULT '[]'::jsonb NOT NULL,
  analisada_em timestamp with time zone DEFAULT now() NOT NULL,
  criado_por uuid DEFAULT auth.uid() NOT NULL
);

-- public.empresa_verificacoes_tributarias
create table public.empresa_verificacoes_tributarias (
  empresa_id uuid NOT NULL,
  ultima_verificacao timestamp with time zone DEFAULT statement_timestamp() NOT NULL,
  verificado_por uuid DEFAULT auth.uid() NOT NULL
);

-- PKs, UNIQUE, CHECKs e FKs finais.
alter table only public.assinaturas add constraint assinaturas_pkey PRIMARY KEY (id);
alter table only public.catalogo_importacoes add constraint catalogo_importacoes_pkey PRIMARY KEY (id);
alter table only public.catalogo_produtos add constraint catalogo_produtos_pkey PRIMARY KEY (id);
alter table only public.categorias add constraint categorias_pkey PRIMARY KEY (id);
alter table only public.clientes add constraint clientes_pkey PRIMARY KEY (id);
alter table only public.compras add constraint compras_pkey PRIMARY KEY (id);
alter table only public.configuracoes add constraint configuracoes_pkey PRIMARY KEY (id);
alter table only public.contas add constraint contas_pkey PRIMARY KEY (id);
alter table only public.contas_pagar add constraint contas_pagar_pkey PRIMARY KEY (id);
alter table only public.crm_oportunidade_historico add constraint crm_oportunidade_historico_pkey PRIMARY KEY (id);
alter table only public.crm_oportunidades add constraint crm_oportunidades_pkey PRIMARY KEY (id);
alter table only public.empresa_alertas_tributarios add constraint empresa_alertas_tributarios_pkey PRIMARY KEY (id);
alter table only public.empresa_configuracoes_tributarias add constraint empresa_configuracoes_tributarias_pkey PRIMARY KEY (id);
alter table only public.empresa_nota_fiscal_analises add constraint empresa_nota_fiscal_analises_pkey PRIMARY KEY (id);
alter table only public.empresa_nota_fiscal_itens add constraint empresa_nota_fiscal_itens_pkey PRIMARY KEY (id);
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_pkey PRIMARY KEY (id);
alter table only public.empresa_regras_tributarias add constraint empresa_regras_tributarias_pkey PRIMARY KEY (id);
alter table only public.empresa_verificacoes_tributarias add constraint empresa_verificacoes_tributarias_pkey PRIMARY KEY (empresa_id);
alter table only public.emprestimos add constraint emprestimos_pkey PRIMARY KEY (id);
alter table only public.estoque add constraint estoque_pkey PRIMARY KEY (id);
alter table only public.estoque_movimentacoes add constraint estoque_movimentacoes_pkey PRIMARY KEY (id);
alter table only public.financeiro_baixas add constraint financeiro_baixas_pkey PRIMARY KEY (id);
alter table only public.financeiro_categorias add constraint financeiro_categorias_pkey PRIMARY KEY (id);
alter table only public.financeiro_conciliacoes add constraint financeiro_conciliacoes_pkey PRIMARY KEY (id);
alter table only public.financeiro_historico add constraint financeiro_historico_pkey PRIMARY KEY (id);
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_pkey PRIMARY KEY (id);
alter table only public.financeiro_titulos add constraint financeiro_titulos_pkey PRIMARY KEY (id);
alter table only public.fornecedores add constraint fornecedores_pkey PRIMARY KEY (id);
alter table only public.ia_comercial_historico add constraint ia_comercial_historico_pkey PRIMARY KEY (id);
alter table only public.inventario_itens add constraint inventario_itens_pkey PRIMARY KEY (id);
alter table only public.inventarios add constraint inventarios_pkey PRIMARY KEY (id);
alter table only public.lancamentos add constraint lancamentos_pkey PRIMARY KEY (id);
alter table only public.lancamentos_pessoais add constraint lancamentos_pessoais_pkey PRIMARY KEY (id);
alter table only public.orcamento_aprovacoes add constraint orcamento_aprovacoes_pkey PRIMARY KEY (id);
alter table only public.orcamento_historico add constraint orcamento_historico_pkey PRIMARY KEY (id);
alter table only public.orcamento_itens add constraint orcamento_itens_pkey PRIMARY KEY (id);
alter table only public.orcamentos add constraint orcamentos_pkey PRIMARY KEY (id);
alter table only public.orcamentos_pessoais_mensais add constraint orcamentos_pessoais_mensais_pkey PRIMARY KEY (id);
alter table only public.ordem_producao_apontamentos add constraint ordem_producao_apontamentos_pkey PRIMARY KEY (id);
alter table only public.ordem_producao_custos add constraint ordem_producao_custos_pkey PRIMARY KEY (id);
alter table only public.ordem_producao_historico add constraint ordem_producao_historico_pkey PRIMARY KEY (id);
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_pkey PRIMARY KEY (id);
alter table only public.ordem_producao_operacao_apontamentos add constraint ordem_producao_operacao_apontamentos_pkey PRIMARY KEY (id);
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_pkey PRIMARY KEY (id);
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_pkey PRIMARY KEY (id);
alter table only public.ordens_producao add constraint ordens_producao_pkey PRIMARY KEY (id);
alter table only public.parcelas add constraint parcelas_pkey PRIMARY KEY (id);
alter table only public.pedido_compra_cotacoes add constraint pedido_compra_cotacoes_pkey PRIMARY KEY (id);
alter table only public.pedido_compra_followups add constraint pedido_compra_followups_pkey PRIMARY KEY (id);
alter table only public.pedido_compra_historico add constraint pedido_compra_historico_pkey PRIMARY KEY (id);
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_pkey PRIMARY KEY (id);
alter table only public.pedido_compra_parcelas add constraint pedido_compra_parcelas_pkey PRIMARY KEY (id);
alter table only public.pedidos_compra add constraint pedidos_compra_pkey PRIMARY KEY (id);
alter table only public.produtos add constraint produtos_pkey PRIMARY KEY (id);
alter table only public.prospeccao_interacoes add constraint prospeccao_interacoes_pkey PRIMARY KEY (id);
alter table only public.prospeccao_prospectos add constraint prospeccao_prospectos_pkey PRIMARY KEY (id);
alter table only public.recebimentos add constraint recebimentos_pkey PRIMARY KEY (id);
alter table only public.recurso_producao_indisponibilidades add constraint recurso_producao_indisponibilidades_pkey PRIMARY KEY (id);
alter table only public.recursos_producao add constraint recursos_producao_pkey PRIMARY KEY (id);
alter table only public.vendas add constraint vendas_pkey PRIMARY KEY (id);
alter table only public.catalogo_produtos add constraint catalogo_produtos_empresa_codigo_key UNIQUE (empresa_id, codigo);
alter table only public.catalogo_produtos add constraint catalogo_produtos_id_empresa_key UNIQUE (id, empresa_id);
alter table only public.clientes add constraint clientes_id_empresa_key UNIQUE (id, empresa_id);
alter table only public.crm_oportunidades add constraint crm_oportunidades_id_empresa_key UNIQUE (id, empresa_id);
alter table only public.empresa_alertas_tributarios add constraint empresa_alertas_tributarios_empresa_id_chave_alerta_key UNIQUE (empresa_id, chave_alerta);
alter table only public.empresa_configuracoes_tributarias add constraint empresa_configuracoes_tributaria_empresa_id_vigencia_inicio_key UNIQUE (empresa_id, vigencia_inicio);
alter table only public.empresa_nota_fiscal_itens add constraint empresa_nota_fiscal_itens_nota_fiscal_id_item_ordem_key UNIQUE (nota_fiscal_id, item_ordem);
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.empresa_regras_tributarias add constraint empresa_regras_tributarias_empresa_id_fonte_oficial_titulo__key UNIQUE (empresa_id, fonte_oficial, titulo, versao);
alter table only public.estoque add constraint estoque_empresa_id_codigo_key UNIQUE (empresa_id, codigo);
alter table only public.estoque add constraint estoque_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.estoque_movimentacoes add constraint estoque_movimentacoes_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.financeiro_baixas add constraint financeiro_baixas_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.financeiro_categorias add constraint financeiro_categorias_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_id_empresa_id_proprietario_id_key UNIQUE (id, empresa_id, proprietario_id);
alter table only public.financeiro_titulos add constraint financeiro_titulos_empresa_id_tipo_origem_origem_id_key UNIQUE (empresa_id, tipo, origem, origem_id);
alter table only public.financeiro_titulos add constraint financeiro_titulos_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.inventario_itens add constraint inventario_itens_inventario_id_estoque_id_key UNIQUE (inventario_id, estoque_id);
alter table only public.inventarios add constraint inventarios_empresa_id_numero_key UNIQUE (empresa_id, numero);
alter table only public.inventarios add constraint inventarios_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.orcamentos add constraint orcamentos_empresa_id_numero_key UNIQUE (empresa_id, numero);
alter table only public.orcamentos add constraint orcamentos_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.orcamentos_pessoais_mensais add constraint orcamentos_pessoais_mensais_empresa_id_proprietario_id_cate_key UNIQUE (empresa_id, proprietario_id, categoria_id, competencia);
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_ordem_id_estoque_id_key UNIQUE (ordem_id, estoque_id);
alter table only public.ordem_producao_operacao_apontamentos add constraint ordem_producao_operacao_apontame_empresa_id_idempotency_key_key UNIQUE (empresa_id, idempotency_key);
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultad_empresa_id_idempotency_key_key UNIQUE (empresa_id, idempotency_key);
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_id_empresa_key UNIQUE (id, empresa_id);
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_ordem_id_recurso_id_key UNIQUE (ordem_id, recurso_id);
alter table only public.ordens_producao add constraint ordens_producao_empresa_id_numero_op_key UNIQUE (empresa_id, numero_op);
alter table only public.ordens_producao add constraint ordens_producao_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.pedido_compra_followups add constraint pedido_compra_followups_empresa_id_idempotency_key_key UNIQUE (empresa_id, idempotency_key);
alter table only public.pedido_compra_parcelas add constraint pedido_compra_parcelas_pedido_id_numero_key UNIQUE (pedido_id, numero);
alter table only public.pedidos_compra add constraint pedidos_compra_empresa_id_numero_key UNIQUE (empresa_id, numero);
alter table only public.pedidos_compra add constraint pedidos_compra_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.prospeccao_prospectos add constraint prospeccao_prospectos_id_empresa_key UNIQUE (id, empresa_id);
alter table only public.recursos_producao add constraint recursos_producao_empresa_id_nome_key UNIQUE (empresa_id, nome);
alter table only public.recursos_producao add constraint recursos_producao_id_empresa_id_key UNIQUE (id, empresa_id);
alter table only public.categorias add constraint categorias_tipo_check CHECK (tipo = ANY (ARRAY['receita'::text, 'despesa'::text]));
alter table only public.contas add constraint contas_tipo_check CHECK (tipo = ANY (ARRAY['pessoal'::text, 'empresa'::text]));
alter table only public.crm_oportunidades add constraint crm_oportunidades_etapa_check CHECK (etapa = ANY (ARRAY['Novo contato'::text, 'Qualificação'::text, 'Proposta em preparação'::text, 'Proposta enviada'::text, 'Negociação'::text, 'Fechado — ganho'::text, 'Fechado — perdido'::text]));
alter table only public.crm_oportunidades add constraint crm_oportunidades_prioridade_check CHECK (prioridade = ANY (ARRAY['Alta'::text, 'Média'::text, 'Baixa'::text]));
alter table only public.crm_oportunidades add constraint crm_oportunidades_probabilidade_check CHECK (probabilidade >= 0::numeric AND probabilidade <= 100::numeric);
alter table only public.crm_oportunidades add constraint crm_oportunidades_quantidade_check CHECK (quantidade IS NULL OR quantidade >= 0::numeric);
alter table only public.crm_oportunidades add constraint crm_oportunidades_valor_estimado_check CHECK (valor_estimado >= 0::numeric);
alter table only public.empresa_alertas_tributarios add constraint empresa_alerta_resolucao_coerente CHECK (NOT resolvido AND resolvido_em IS NULL OR resolvido AND resolvido_em IS NOT NULL);
alter table only public.empresa_alertas_tributarios add constraint empresa_alertas_tributarios_classificacao_check CHECK (classificacao = ANY (ARRAY['INFO'::text, 'ATENCAO'::text, 'CRITICO'::text]));
alter table only public.empresa_configuracoes_tributarias add constraint empresa_config_tributaria_modalidade_coerente CHECK (regime_base = 'simples_nacional'::text OR ibs_cbs_modalidade = 'regime_regular'::text);
alter table only public.empresa_configuracoes_tributarias add constraint empresa_config_tributaria_vigencia_valida CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio);
alter table only public.empresa_configuracoes_tributarias add constraint empresa_configuracoes_tributarias_ibs_cbs_modalidade_check CHECK (ibs_cbs_modalidade = ANY (ARRAY['simples_nacional'::text, 'regime_regular'::text]));
alter table only public.empresa_configuracoes_tributarias add constraint empresa_configuracoes_tributarias_regime_base_check CHECK (regime_base = ANY (ARRAY['lucro_real'::text, 'lucro_presumido'::text, 'simples_nacional'::text]));
alter table only public.empresa_nota_fiscal_analises add constraint empresa_nota_fiscal_analises_alertas_check CHECK (jsonb_typeof(alertas) = 'array'::text);
alter table only public.empresa_nota_fiscal_analises add constraint empresa_nota_fiscal_analises_quantidade_alertas_check CHECK (quantidade_alertas >= 0);
alter table only public.empresa_nota_fiscal_analises add constraint empresa_nota_fiscal_analises_status_check CHECK (status = ANY (ARRAY['regular'::text, 'atencao'::text, 'critico'::text, 'pendente_revisao'::text]));
alter table only public.empresa_nota_fiscal_itens add constraint empresa_nota_fiscal_itens_confianca_extracao_check CHECK (confianca_extracao >= 0::numeric AND confianca_extracao <= 1::numeric);
alter table only public.empresa_nota_fiscal_itens add constraint empresa_nota_fiscal_itens_csosn_icms_check CHECK (csosn_icms IS NULL OR csosn_icms ~ '^[0-9]{3}$'::text);
alter table only public.empresa_nota_fiscal_itens add constraint empresa_nota_fiscal_itens_cst_icms_check CHECK (cst_icms IS NULL OR cst_icms ~ '^[0-9]{2,3}$'::text);
alter table only public.empresa_nota_fiscal_itens add constraint empresa_nota_fiscal_itens_item_ordem_check CHECK (item_ordem > 0);
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_confianca_extracao_check CHECK (confianca_extracao >= 0::numeric AND confianca_extracao <= 1::numeric);
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_status_tributario_check CHECK (status_tributario = ANY (ARRAY['regular'::text, 'atencao'::text, 'critico'::text, 'pendente_revisao'::text]));
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_tipo_operacao_check CHECK (tipo_operacao = ANY (ARRAY['entrada'::text, 'saida'::text]));
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_uf_destinatario_check CHECK (uf_destinatario IS NULL OR uf_destinatario ~ '^[A-Z]{2}$'::text);
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_uf_emitente_check CHECK (uf_emitente IS NULL OR uf_emitente ~ '^[A-Z]{2}$'::text);
alter table only public.empresa_regras_tributarias add constraint empresa_regras_tributarias_classificacao_check CHECK (classificacao = ANY (ARRAY['INFO'::text, 'ATENCAO'::text, 'CRITICO'::text]));
alter table only public.empresa_regras_tributarias add constraint empresa_regras_tributarias_fonte_oficial_check CHECK (fonte_oficial = ANY (ARRAY['Receita Federal'::text, 'CGSN'::text, 'CGIBS'::text, 'Legislação oficial'::text]));
alter table only public.empresa_regras_tributarias add constraint empresa_regras_tributarias_url_fonte_check CHECK (url_fonte ~ '^https://'::text);
alter table only public.estoque add constraint estoque_check CHECK (estoque_maximo IS NULL OR estoque_maximo >= estoque_minimo);
alter table only public.estoque add constraint estoque_check1 CHECK (estoque_reservado <= estoque_atual);
alter table only public.estoque add constraint estoque_custo_unitario_check CHECK (custo_unitario >= 0::numeric);
alter table only public.estoque add constraint estoque_estoque_atual_check CHECK (estoque_atual >= 0::numeric);
alter table only public.estoque add constraint estoque_estoque_minimo_check CHECK (estoque_minimo >= 0::numeric);
alter table only public.estoque add constraint estoque_estoque_reservado_check CHECK (estoque_reservado >= 0::numeric);
alter table only public.estoque add constraint estoque_peso_unitario_check CHECK (peso_unitario >= 0::numeric);
alter table only public.estoque add constraint estoque_ponto_reposicao_check CHECK (ponto_reposicao >= 0::numeric);
alter table only public.estoque add constraint estoque_prazo_reposicao_dias_check CHECK (prazo_reposicao_dias >= 0);
alter table only public.estoque_movimentacoes add constraint estoque_movimentacoes_quantidade_check CHECK (quantidade >= 0::numeric);
alter table only public.estoque_movimentacoes add constraint estoque_movimentacoes_tipo_check CHECK (tipo = ANY (ARRAY['Entrada'::text, 'Saída'::text, 'Transferência'::text, 'Reserva'::text, 'Liberação'::text, 'Ajuste'::text, 'Inventário'::text, 'Reversão'::text]));
alter table only public.financeiro_baixas add constraint financeiro_baixas_saldo_resultante_check CHECK (saldo_resultante >= 0::numeric);
alter table only public.financeiro_baixas add constraint financeiro_baixas_tipo_check CHECK (tipo = ANY (ARRAY['Baixa'::text, 'Estorno'::text]));
alter table only public.financeiro_baixas add constraint financeiro_baixas_valor_baixado_anterior_check CHECK (valor_baixado_anterior >= 0::numeric);
alter table only public.financeiro_baixas add constraint financeiro_baixas_valor_baixado_resultante_check CHECK (valor_baixado_resultante >= 0::numeric);
alter table only public.financeiro_baixas add constraint financeiro_baixas_valor_check CHECK (valor > 0::numeric);
alter table only public.financeiro_categorias add constraint financeiro_categorias_classificacao_check CHECK (classificacao = ANY (ARRAY['Fixa'::text, 'Variável essencial'::text, 'Variável não essencial'::text, 'Custo fixo'::text, 'Custo variável'::text]));
alter table only public.financeiro_categorias add constraint financeiro_categorias_nome_check CHECK (length(btrim(nome)) > 0);
alter table only public.financeiro_conciliacoes add constraint financeiro_conciliacoes_check CHECK (titulo_id IS NOT NULL OR baixa_id IS NOT NULL);
alter table only public.financeiro_conciliacoes add constraint financeiro_conciliacoes_status_check CHECK (status = ANY (ARRAY['Pendente'::text, 'Conciliado'::text, 'Divergente'::text]));
alter table only public.financeiro_conciliacoes add constraint financeiro_conciliacoes_valor_check CHECK (valor > 0::numeric);
alter table only public.financeiro_historico add constraint financeiro_historico_tipo_check CHECK (tipo = ANY (ARRAY['Criação'::text, 'Edição'::text, 'Baixa'::text, 'Baixa parcial'::text, 'Estorno'::text, 'Conciliação'::text, 'Vencimento'::text, 'Integração'::text]));
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_check CHECK (data_fim IS NULL OR data_fim >= data_inicio);
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_check1 CHECK (escopo = 'Pessoal'::text AND proprietario_id IS NOT NULL OR escopo = 'Empresarial'::text AND proprietario_id IS NULL);
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_classificacao_check CHECK (classificacao = ANY (ARRAY['Fixa'::text, 'Variável essencial'::text, 'Variável não essencial'::text, 'Custo fixo'::text, 'Custo variável'::text]));
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_descricao_check CHECK (length(btrim(descricao)) > 0);
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_dia_vencimento_check CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31);
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_escopo_check CHECK (escopo = ANY (ARRAY['Pessoal'::text, 'Empresarial'::text]));
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_frequencia_check CHECK (frequencia = ANY (ARRAY['Mensal'::text, 'Semanal'::text, 'Quinzenal'::text, 'Anual'::text]));
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_valor_previsto_check CHECK (valor_previsto > 0::numeric);
alter table only public.financeiro_titulos add constraint financeiro_titulos_check CHECK (valor_baixado >= 0::numeric AND valor_baixado <= valor_original);
alter table only public.financeiro_titulos add constraint financeiro_titulos_origem_check CHECK (origem = ANY (ARRAY['Compra'::text, 'Venda'::text, 'Orçamento'::text, 'Despesa'::text, 'Manual'::text, 'Imposto'::text, 'Serviço'::text, 'Outro'::text]));
alter table only public.financeiro_titulos add constraint financeiro_titulos_recorrencia_competencia_check CHECK (recorrencia_id IS NULL AND competencia IS NULL OR recorrencia_id IS NOT NULL AND competencia IS NOT NULL AND competencia = date_trunc('month'::text, competencia::timestamp with time zone)::date);
alter table only public.financeiro_titulos add constraint financeiro_titulos_status_check CHECK (status = ANY (ARRAY['Pendente'::text, 'Parcial'::text, 'Liquidado'::text, 'Cancelado'::text]));
alter table only public.financeiro_titulos add constraint financeiro_titulos_tipo_check CHECK (tipo = ANY (ARRAY['Pagar'::text, 'Receber'::text]));
alter table only public.financeiro_titulos add constraint financeiro_titulos_valor_original_check CHECK (valor_original > 0::numeric);
alter table only public.inventarios add constraint inventarios_status_check CHECK (status = ANY (ARRAY['Em contagem'::text, 'Conferido'::text, 'Ajustado'::text, 'Cancelado'::text]));
alter table only public.lancamentos add constraint lancamentos_tipo_check CHECK (tipo = ANY (ARRAY['receita'::text, 'despesa'::text]));
alter table only public.orcamento_aprovacoes add constraint orcamento_aprovacoes_decisao_check CHECK (decisao = ANY (ARRAY['Aprovado'::text, 'Rejeitado'::text]));
alter table only public.orcamento_aprovacoes add constraint orcamento_aprovacoes_observacao_check CHECK (length(TRIM(BOTH FROM observacao)) > 0);
alter table only public.orcamento_historico add constraint orcamento_historico_tipo_check CHECK (tipo = ANY (ARRAY['Criação'::text, 'Edição'::text, 'Envio'::text, 'Aprovação'::text, 'Rejeição'::text, 'Cancelamento'::text]));
alter table only public.orcamento_itens add constraint orcamento_itens_peso_check CHECK (peso >= 0::numeric);
alter table only public.orcamento_itens add constraint orcamento_itens_preco_unitario_check CHECK (preco_unitario >= 0::numeric);
alter table only public.orcamento_itens add constraint orcamento_itens_quantidade_check CHECK (quantidade > 0::numeric);
alter table only public.orcamento_itens add constraint orcamento_itens_subtotal_check CHECK (subtotal >= 0::numeric);
alter table only public.orcamentos add constraint orcamentos_comissao_check CHECK (comissao >= 0::numeric);
alter table only public.orcamentos add constraint orcamentos_desconto_check CHECK (desconto >= 0::numeric);
alter table only public.orcamentos add constraint orcamentos_impostos_check CHECK (impostos >= 0::numeric);
alter table only public.orcamentos add constraint orcamentos_status_check CHECK (status = ANY (ARRAY['Rascunho'::text, 'Em elaboração'::text, 'Enviado'::text, 'Aprovado'::text, 'Rejeitado'::text, 'Cancelado'::text]));
alter table only public.orcamentos add constraint orcamentos_subtotal_check CHECK (subtotal >= 0::numeric);
alter table only public.orcamentos add constraint orcamentos_valor_final_check CHECK (valor_final >= 0::numeric);
alter table only public.orcamentos_pessoais_mensais add constraint orcamentos_pessoais_mensais_competencia_check CHECK (competencia = date_trunc('month'::text, competencia::timestamp with time zone)::date);
alter table only public.orcamentos_pessoais_mensais add constraint orcamentos_pessoais_mensais_valor_previsto_check CHECK (valor_previsto >= 0::numeric);
alter table only public.ordem_producao_apontamentos add constraint ordem_producao_apontamentos_motivo_perda_check CHECK (motivo_perda IS NULL OR (motivo_perda = ANY (ARRAY['Qualidade'::text, 'Processo'::text, 'Matéria-prima'::text, 'Equipamento'::text, 'Medida'::text, 'Outro'::text])));
alter table only public.ordem_producao_apontamentos add constraint ordem_producao_apontamentos_peso_check CHECK (peso >= 0::numeric);
alter table only public.ordem_producao_apontamentos add constraint ordem_producao_apontamentos_quantidade_check CHECK (quantidade >= 0::numeric);
alter table only public.ordem_producao_apontamentos add constraint ordem_producao_apontamentos_tipo_check CHECK (tipo = ANY (ARRAY['Início'::text, 'Pausa'::text, 'Retomada'::text, 'Produção'::text, 'Perda'::text, 'Conclusão'::text]));
alter table only public.ordem_producao_custos add constraint ordem_producao_custos_tipo_check CHECK (tipo = ANY (ARRAY['Mão de obra'::text, 'Energia'::text, 'Máquina/equipamento'::text, 'Terceiros'::text, 'Transporte interno'::text, 'Outros custos operacionais'::text]));
alter table only public.ordem_producao_custos add constraint ordem_producao_custos_valor_check CHECK (valor > 0::numeric);
alter table only public.ordem_producao_historico add constraint ordem_producao_historico_tipo_check CHECK (tipo = ANY (ARRAY['Criação'::text, 'Edição'::text, 'Planejamento'::text, 'Programação'::text, 'Reserva'::text, 'Início'::text, 'Pausa'::text, 'Retomada'::text, 'Consumo'::text, 'Devolução'::text, 'Perda'::text, 'Conclusão'::text, 'Cancelamento'::text, 'Compra'::text, 'Produto acabado'::text]));
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_check CHECK ((quantidade_reservada + quantidade_consumida) <= quantidade_prevista);
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_quantidade_consumida_check CHECK (quantidade_consumida >= 0::numeric);
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_quantidade_prevista_check CHECK (quantidade_prevista > 0::numeric);
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_quantidade_reservada_check CHECK (quantidade_reservada >= 0::numeric);
alter table only public.ordem_producao_operacao_apontamentos add constraint ordem_producao_operacao_apontamentos_tipo_check CHECK (tipo = ANY (ARRAY['Liberação'::text, 'Início'::text, 'Pausa'::text, 'Retomada'::text, 'Conclusão'::text, 'Cancelamento'::text]));
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_check CHECK ((quantidade_boa + quantidade_refugada) > 0::numeric);
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_check1 CHECK (quantidade_refugada = 0::numeric OR motivo_refugo IS NOT NULL);
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_motivo_refugo_check CHECK (motivo_refugo IS NULL OR (motivo_refugo = ANY (ARRAY['Qualidade'::text, 'Processo'::text, 'Matéria-prima'::text, 'Equipamento'::text, 'Medida'::text, 'Outro'::text])));
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_operador_check CHECK (length(TRIM(BOTH FROM operador)) > 0);
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_quantidade_boa_check CHECK (quantidade_boa >= 0::numeric);
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_quantidade_refugada_check CHECK (quantidade_refugada >= 0::numeric);
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_quantidade_planejada_check CHECK (quantidade_planejada > 0::numeric);
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_sequencia_check CHECK (sequencia > 0);
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_status_operacao_check CHECK (status_operacao = ANY (ARRAY['Pendente'::text, 'Liberada'::text, 'Em execução'::text, 'Pausada'::text, 'Concluída'::text, 'Cancelada'::text]));
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_tempo_total_horas_check CHECK (tempo_total_horas IS NULL OR tempo_total_horas > 0::numeric);
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_tempo_unitario_horas_check CHECK (tempo_unitario_horas IS NULL OR tempo_unitario_horas > 0::numeric);
alter table only public.ordens_producao add constraint ordens_producao_check CHECK ((quantidade_produzida + quantidade_perdida) <= quantidade_planejada);
alter table only public.ordens_producao add constraint ordens_producao_peso_perdido_check CHECK (peso_perdido >= 0::numeric);
alter table only public.ordens_producao add constraint ordens_producao_peso_planejado_check CHECK (peso_planejado >= 0::numeric);
alter table only public.ordens_producao add constraint ordens_producao_peso_produzido_check CHECK (peso_produzido >= 0::numeric);
alter table only public.ordens_producao add constraint ordens_producao_prioridade_check CHECK (prioridade = ANY (ARRAY['Baixa'::text, 'Média'::text, 'Alta'::text, 'Urgente'::text]));
alter table only public.ordens_producao add constraint ordens_producao_quantidade_perdida_check CHECK (quantidade_perdida >= 0::numeric);
alter table only public.ordens_producao add constraint ordens_producao_quantidade_planejada_check CHECK (quantidade_planejada > 0::numeric);
alter table only public.ordens_producao add constraint ordens_producao_quantidade_produzida_check CHECK (quantidade_produzida >= 0::numeric);
alter table only public.ordens_producao add constraint ordens_producao_status_check CHECK (status = ANY (ARRAY['Rascunho'::text, 'Planejada'::text, 'Aguardando material'::text, 'Liberada'::text, 'Em produção'::text, 'Pausada'::text, 'Concluída'::text, 'Cancelada'::text]));
alter table only public.pedido_compra_cotacoes add constraint pedido_compra_cotacoes_custo_kg_check CHECK (custo_kg >= 0::numeric);
alter table only public.pedido_compra_cotacoes add constraint pedido_compra_cotacoes_prazo_dias_check CHECK (prazo_dias >= 0);
alter table only public.pedido_compra_cotacoes add constraint pedido_compra_cotacoes_valor_total_check CHECK (valor_total >= 0::numeric);
alter table only public.pedido_compra_historico add constraint pedido_compra_historico_tipo_check CHECK (tipo = ANY (ARRAY['Criação'::text, 'Edição'::text, 'Solicitação'::text, 'Cotação'::text, 'Aprovação'::text, 'Compra'::text, 'Cancelamento'::text, 'Recebimento'::text, 'Estoque'::text, 'Financeiro'::text]));
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_check CHECK (quantidade_recebida <= quantidade);
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_comissao_check CHECK (comissao >= 0::numeric);
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_peso_check CHECK (peso >= 0::numeric);
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_quantidade_check CHECK (quantidade > 0::numeric);
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_quantidade_recebida_check CHECK (quantidade_recebida >= 0::numeric);
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_subtotal_check CHECK (subtotal >= 0::numeric);
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_valor_unitario_check CHECK (valor_unitario >= 0::numeric);
alter table only public.pedido_compra_parcelas add constraint pedido_compra_parcelas_numero_check CHECK (numero > 0);
alter table only public.pedido_compra_parcelas add constraint pedido_compra_parcelas_status_check CHECK (status = ANY (ARRAY['Pendente'::text, 'Pago'::text, 'Cancelado'::text]));
alter table only public.pedido_compra_parcelas add constraint pedido_compra_parcelas_valor_check CHECK (valor >= 0::numeric);
alter table only public.pedidos_compra add constraint pedidos_compra_desconto_check CHECK (desconto >= 0::numeric);
alter table only public.pedidos_compra add constraint pedidos_compra_frete_check CHECK (frete >= 0::numeric);
alter table only public.pedidos_compra add constraint pedidos_compra_status_check CHECK (status = ANY (ARRAY['Rascunho'::text, 'Solicitado'::text, 'Em cotação'::text, 'Aprovado'::text, 'Comprado'::text, 'Recebido parcialmente'::text, 'Recebido'::text, 'Cancelado'::text]));
alter table only public.pedidos_compra add constraint pedidos_compra_valor_total_check CHECK (valor_total >= 0::numeric);
alter table only public.recurso_producao_indisponibilidades add constraint recurso_producao_indisponibilidades_check CHECK (fim >= inicio);
alter table only public.recurso_producao_indisponibilidades add constraint recurso_producao_indisponibilidades_tipo_check CHECK (tipo = ANY (ARRAY['Indisponibilidade'::text, 'Manutenção'::text, 'Parada programada'::text]));
alter table only public.recursos_producao add constraint recursos_producao_capacidade_nominal_check CHECK (capacidade_nominal IS NULL OR capacidade_nominal > 0::numeric);
alter table only public.recursos_producao add constraint recursos_producao_dias_trabalho_check CHECK (dias_trabalho <@ ARRAY[0::smallint, 1::smallint, 2::smallint, 3::smallint, 4::smallint, 5::smallint, 6::smallint]);
alter table only public.recursos_producao add constraint recursos_producao_horas_disponiveis_dia_check CHECK (horas_disponiveis_dia IS NULL OR horas_disponiveis_dia > 0::numeric AND horas_disponiveis_dia <= 24::numeric);
alter table only public.recursos_producao add constraint recursos_producao_tipo_check CHECK (tipo = ANY (ARRAY['Máquina'::text, 'Forno'::text, 'Serra'::text, 'Prensa'::text, 'Linha'::text, 'Equipe'::text, 'Posto de trabalho'::text, 'Outro recurso'::text]));
alter table only public.catalogo_importacoes add constraint catalogo_importacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.catalogo_importacoes add constraint catalogo_importacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.catalogo_produtos add constraint catalogo_produtos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.catalogo_produtos add constraint catalogo_produtos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;
alter table only public.clientes add constraint clientes_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.compras add constraint compras_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES produtos(id);
alter table only public.contas add constraint contas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
alter table only public.crm_oportunidade_historico add constraint crm_historico_oportunidade_tenant_fkey FOREIGN KEY (oportunidade_id, empresa_id) REFERENCES crm_oportunidades(id, empresa_id) ON UPDATE CASCADE ON DELETE CASCADE;
alter table only public.crm_oportunidade_historico add constraint crm_oportunidade_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.crm_oportunidade_historico add constraint crm_oportunidade_historico_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;
alter table only public.crm_oportunidades add constraint crm_oportunidade_cliente_tenant_fkey FOREIGN KEY (cliente_id, empresa_id) REFERENCES clientes(id, empresa_id) ON UPDATE CASCADE ON DELETE SET NULL (cliente_id);
alter table only public.crm_oportunidades add constraint crm_oportunidades_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.crm_oportunidades add constraint crm_oportunidades_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;
alter table only public.empresa_alertas_tributarios add constraint empresa_alertas_tributarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.empresa_configuracoes_tributarias add constraint empresa_configuracoes_tributarias_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.empresa_configuracoes_tributarias add constraint empresa_configuracoes_tributarias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.empresa_nota_fiscal_analises add constraint empresa_nota_fiscal_analises_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);
alter table only public.empresa_nota_fiscal_analises add constraint empresa_nota_fiscal_analises_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table only public.empresa_nota_fiscal_analises add constraint empresa_nota_fiscal_analises_nota_empresa_fk FOREIGN KEY (nota_fiscal_id, empresa_id) REFERENCES empresa_notas_fiscais_tributarias(id, empresa_id) ON DELETE CASCADE;
alter table only public.empresa_nota_fiscal_itens add constraint empresa_nota_fiscal_itens_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table only public.empresa_nota_fiscal_itens add constraint empresa_nota_fiscal_itens_nota_empresa_fk FOREIGN KEY (nota_fiscal_id, empresa_id) REFERENCES empresa_notas_fiscais_tributarias(id, empresa_id) ON DELETE CASCADE;
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table only public.empresa_notas_fiscais_tributarias add constraint empresa_notas_fiscais_tributarias_revisada_por_fkey FOREIGN KEY (revisada_por) REFERENCES auth.users(id);
alter table only public.empresa_regras_tributarias add constraint empresa_regras_tributarias_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.empresa_regras_tributarias add constraint empresa_regras_tributarias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.empresa_verificacoes_tributarias add constraint empresa_verificacoes_tributarias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.empresa_verificacoes_tributarias add constraint empresa_verificacoes_tributarias_verificado_por_fkey FOREIGN KEY (verificado_por) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.estoque add constraint estoque_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.estoque_movimentacoes add constraint estoque_movimentacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.estoque_movimentacoes add constraint estoque_movimentacoes_estoque_id_empresa_id_fkey FOREIGN KEY (estoque_id, empresa_id) REFERENCES estoque(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.estoque_movimentacoes add constraint estoque_movimentacoes_reversao_de_empresa_id_fkey FOREIGN KEY (reversao_de, empresa_id) REFERENCES estoque_movimentacoes(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.estoque_movimentacoes add constraint estoque_movimentacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_baixas add constraint financeiro_baixas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_baixas add constraint financeiro_baixas_estorno_de_empresa_id_fkey FOREIGN KEY (estorno_de, empresa_id) REFERENCES financeiro_baixas(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_baixas add constraint financeiro_baixas_titulo_id_empresa_id_fkey FOREIGN KEY (titulo_id, empresa_id) REFERENCES financeiro_titulos(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_baixas add constraint financeiro_baixas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_categorias add constraint financeiro_categorias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_categorias add constraint financeiro_categorias_proprietario_id_fkey FOREIGN KEY (proprietario_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_conciliacoes add constraint financeiro_conciliacoes_baixa_id_empresa_id_fkey FOREIGN KEY (baixa_id, empresa_id) REFERENCES financeiro_baixas(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_conciliacoes add constraint financeiro_conciliacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_conciliacoes add constraint financeiro_conciliacoes_titulo_id_empresa_id_fkey FOREIGN KEY (titulo_id, empresa_id) REFERENCES financeiro_titulos(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_conciliacoes add constraint financeiro_conciliacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_historico add constraint financeiro_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_historico add constraint financeiro_historico_titulo_id_empresa_id_fkey FOREIGN KEY (titulo_id, empresa_id) REFERENCES financeiro_titulos(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_historico add constraint financeiro_historico_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_categoria_id_empresa_id_fkey FOREIGN KEY (categoria_id, empresa_id) REFERENCES financeiro_categorias(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_recorrencias add constraint financeiro_recorrencias_proprietario_id_fkey FOREIGN KEY (proprietario_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_titulos add constraint financeiro_titulos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_titulos add constraint financeiro_titulos_recorrencia_fkey FOREIGN KEY (recorrencia_id, empresa_id) REFERENCES financeiro_recorrencias(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.financeiro_titulos add constraint financeiro_titulos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.fornecedores add constraint fornecedores_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id);
alter table only public.ia_comercial_historico add constraint ia_comercial_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ia_comercial_historico add constraint ia_comercial_historico_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
alter table only public.inventario_itens add constraint inventario_itens_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.inventario_itens add constraint inventario_itens_estoque_id_empresa_id_fkey FOREIGN KEY (estoque_id, empresa_id) REFERENCES estoque(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.inventario_itens add constraint inventario_itens_inventario_id_empresa_id_fkey FOREIGN KEY (inventario_id, empresa_id) REFERENCES inventarios(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.inventarios add constraint inventarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.inventarios add constraint inventarios_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.lancamentos add constraint lancamentos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id);
alter table only public.lancamentos add constraint lancamentos_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas(id);
alter table only public.lancamentos add constraint lancamentos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
alter table only public.orcamento_aprovacoes add constraint orcamento_aprovacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamento_aprovacoes add constraint orcamento_aprovacoes_orcamento_id_empresa_id_fkey FOREIGN KEY (orcamento_id, empresa_id) REFERENCES orcamentos(id, empresa_id) ON UPDATE CASCADE ON DELETE CASCADE;
alter table only public.orcamento_aprovacoes add constraint orcamento_aprovacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamento_historico add constraint orcamento_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamento_historico add constraint orcamento_historico_orcamento_id_empresa_id_fkey FOREIGN KEY (orcamento_id, empresa_id) REFERENCES orcamentos(id, empresa_id) ON UPDATE CASCADE ON DELETE CASCADE;
alter table only public.orcamento_historico add constraint orcamento_historico_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamento_itens add constraint orcamento_itens_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamento_itens add constraint orcamento_itens_orcamento_id_empresa_id_fkey FOREIGN KEY (orcamento_id, empresa_id) REFERENCES orcamentos(id, empresa_id) ON UPDATE CASCADE ON DELETE CASCADE;
alter table only public.orcamentos add constraint orcamentos_cliente_id_empresa_id_fkey FOREIGN KEY (cliente_id, empresa_id) REFERENCES clientes(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamentos add constraint orcamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamentos add constraint orcamentos_oportunidade_id_empresa_id_fkey FOREIGN KEY (oportunidade_id, empresa_id) REFERENCES crm_oportunidades(id, empresa_id) ON UPDATE CASCADE ON DELETE SET NULL (oportunidade_id);
alter table only public.orcamentos add constraint orcamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamentos_pessoais_mensais add constraint orcamentos_pessoais_mensais_categoria_id_empresa_id_fkey FOREIGN KEY (categoria_id, empresa_id) REFERENCES financeiro_categorias(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamentos_pessoais_mensais add constraint orcamentos_pessoais_mensais_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.orcamentos_pessoais_mensais add constraint orcamentos_pessoais_mensais_proprietario_id_fkey FOREIGN KEY (proprietario_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_apontamentos add constraint ordem_producao_apontamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_apontamentos add constraint ordem_producao_apontamentos_ordem_id_empresa_id_fkey FOREIGN KEY (ordem_id, empresa_id) REFERENCES ordens_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_apontamentos add constraint ordem_producao_apontamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_custos add constraint ordem_producao_custos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_custos add constraint ordem_producao_custos_ordem_id_empresa_id_fkey FOREIGN KEY (ordem_id, empresa_id) REFERENCES ordens_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_custos add constraint ordem_producao_custos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_historico add constraint ordem_producao_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_historico add constraint ordem_producao_historico_ordem_id_empresa_id_fkey FOREIGN KEY (ordem_id, empresa_id) REFERENCES ordens_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_historico add constraint ordem_producao_historico_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_estoque_id_empresa_id_fkey FOREIGN KEY (estoque_id, empresa_id) REFERENCES estoque(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_materiais add constraint ordem_producao_materiais_ordem_id_empresa_id_fkey FOREIGN KEY (ordem_id, empresa_id) REFERENCES ordens_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_apontamentos add constraint ordem_producao_operacao_apontamento_alocacao_id_empresa_id_fkey FOREIGN KEY (alocacao_id, empresa_id) REFERENCES ordem_producao_recursos(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_apontamentos add constraint ordem_producao_operacao_apontamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_apontamentos add constraint ordem_producao_operacao_apontamentos_ordem_id_empresa_id_fkey FOREIGN KEY (ordem_id, empresa_id) REFERENCES ordens_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_apontamentos add constraint ordem_producao_operacao_apontamentos_recurso_id_empresa_id_fkey FOREIGN KEY (recurso_id, empresa_id) REFERENCES recursos_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_apontamentos add constraint ordem_producao_operacao_apontamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_alocacao_id_empresa_id_fkey FOREIGN KEY (alocacao_id, empresa_id) REFERENCES ordem_producao_recursos(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_ordem_id_empresa_id_fkey FOREIGN KEY (ordem_id, empresa_id) REFERENCES ordens_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_recurso_id_empresa_id_fkey FOREIGN KEY (recurso_id, empresa_id) REFERENCES recursos_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_operacao_resultados add constraint ordem_producao_operacao_resultados_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_ordem_id_empresa_id_fkey FOREIGN KEY (ordem_id, empresa_id) REFERENCES ordens_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_recurso_id_empresa_id_fkey FOREIGN KEY (recurso_id, empresa_id) REFERENCES recursos_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordem_producao_recursos add constraint ordem_producao_recursos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordens_producao add constraint ordens_producao_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordens_producao add constraint ordens_producao_orcamento_id_empresa_id_fkey FOREIGN KEY (orcamento_id, empresa_id) REFERENCES orcamentos(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordens_producao add constraint ordens_producao_produto_acabado_estoque_id_empresa_id_fkey FOREIGN KEY (produto_acabado_estoque_id, empresa_id) REFERENCES estoque(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.ordens_producao add constraint ordens_producao_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.parcelas add constraint parcelas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id);
alter table only public.parcelas add constraint parcelas_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE;
alter table only public.pedido_compra_cotacoes add constraint pedido_compra_cotacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_cotacoes add constraint pedido_compra_cotacoes_pedido_id_empresa_id_fkey FOREIGN KEY (pedido_id, empresa_id) REFERENCES pedidos_compra(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_followups add constraint pedido_compra_followups_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_followups add constraint pedido_compra_followups_pedido_id_empresa_id_fkey FOREIGN KEY (pedido_id, empresa_id) REFERENCES pedidos_compra(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_followups add constraint pedido_compra_followups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_historico add constraint pedido_compra_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_historico add constraint pedido_compra_historico_pedido_id_empresa_id_fkey FOREIGN KEY (pedido_id, empresa_id) REFERENCES pedidos_compra(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_historico add constraint pedido_compra_historico_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_estoque_id_empresa_id_fkey FOREIGN KEY (estoque_id, empresa_id) REFERENCES estoque(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_itens add constraint pedido_compra_itens_pedido_id_empresa_id_fkey FOREIGN KEY (pedido_id, empresa_id) REFERENCES pedidos_compra(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_parcelas add constraint pedido_compra_parcelas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedido_compra_parcelas add constraint pedido_compra_parcelas_pedido_id_empresa_id_fkey FOREIGN KEY (pedido_id, empresa_id) REFERENCES pedidos_compra(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedidos_compra add constraint pedidos_compra_aprovado_por_fkey FOREIGN KEY (aprovado_por) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedidos_compra add constraint pedidos_compra_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.pedidos_compra add constraint pedidos_compra_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.produtos add constraint produtos_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.prospeccao_interacoes add constraint prospeccao_interacao_tenant_fkey FOREIGN KEY (prospecto_id, empresa_id) REFERENCES prospeccao_prospectos(id, empresa_id) ON UPDATE CASCADE ON DELETE CASCADE;
alter table only public.prospeccao_interacoes add constraint prospeccao_interacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.prospeccao_interacoes add constraint prospeccao_interacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;
alter table only public.prospeccao_prospectos add constraint prospeccao_cliente_tenant_fkey FOREIGN KEY (convertido_cliente_id, empresa_id) REFERENCES clientes(id, empresa_id) ON UPDATE CASCADE ON DELETE SET NULL (convertido_cliente_id);
alter table only public.prospeccao_prospectos add constraint prospeccao_oportunidade_tenant_fkey FOREIGN KEY (oportunidade_id, empresa_id) REFERENCES crm_oportunidades(id, empresa_id) ON UPDATE CASCADE ON DELETE SET NULL (oportunidade_id);
alter table only public.prospeccao_prospectos add constraint prospeccao_prospectos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.prospeccao_prospectos add constraint prospeccao_prospectos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;
alter table only public.recebimentos add constraint recebimentos_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES vendas(id);
alter table only public.recurso_producao_indisponibilidades add constraint recurso_producao_indisponibilidades_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.recurso_producao_indisponibilidades add constraint recurso_producao_indisponibilidades_recurso_id_empresa_id_fkey FOREIGN KEY (recurso_id, empresa_id) REFERENCES recursos_producao(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.recurso_producao_indisponibilidades add constraint recurso_producao_indisponibilidades_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.recursos_producao add constraint recursos_producao_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.recursos_producao add constraint recursos_producao_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.vendas add constraint vendas_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.configuracoes
-- Indices finais nao associados diretamente a constraints.
CREATE INDEX catalogo_importacoes_empresa_created_idx ON public.catalogo_importacoes USING btree (empresa_id, created_at DESC);
CREATE INDEX catalogo_produtos_empresa_status_idx ON public.catalogo_produtos USING btree (empresa_id, status);
CREATE UNIQUE INDEX compras_empresa_idempotency_key ON public.compras USING btree (empresa_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX crm_historico_empresa_oportunidade_idx ON public.crm_oportunidade_historico USING btree (empresa_id, oportunidade_id, created_at DESC);
CREATE INDEX crm_oportunidades_empresa_cliente_idx ON public.crm_oportunidades USING btree (empresa_id, cliente_id);
CREATE INDEX crm_oportunidades_empresa_created_idx ON public.crm_oportunidades USING btree (empresa_id, created_at DESC);
CREATE INDEX crm_oportunidades_empresa_etapa_idx ON public.crm_oportunidades USING btree (empresa_id, etapa);
CREATE INDEX crm_oportunidades_empresa_previsao_idx ON public.crm_oportunidades USING btree (empresa_id, previsao_fechamento);
CREATE INDEX crm_oportunidades_empresa_responsavel_idx ON public.crm_oportunidades USING btree (empresa_id, responsavel);
CREATE INDEX empresa_alertas_tributarios_empresa_abertos_idx ON public.empresa_alertas_tributarios USING btree (empresa_id, classificacao) WHERE (NOT resolvido);
CREATE INDEX empresa_config_tributaria_criado_por_idx ON public.empresa_configuracoes_tributarias USING btree (criado_por);
CREATE INDEX empresa_config_tributaria_empresa_vigencia_idx ON public.empresa_configuracoes_tributarias USING btree (empresa_id, vigencia_inicio DESC);
CREATE INDEX empresa_nota_fiscal_analises_empresa_nota_idx ON public.empresa_nota_fiscal_analises USING btree (empresa_id, nota_fiscal_id, analisada_em DESC);
CREATE INDEX empresa_nota_fiscal_itens_empresa_nota_idx ON public.empresa_nota_fiscal_itens USING btree (empresa_id, nota_fiscal_id, item_ordem);
CREATE UNIQUE INDEX empresa_notas_fiscais_chave_empresa_uq ON public.empresa_notas_fiscais_tributarias USING btree (empresa_id, chave_acesso) WHERE (chave_acesso IS NOT NULL);
CREATE INDEX empresa_notas_fiscais_empresa_emissao_idx ON public.empresa_notas_fiscais_tributarias USING btree (empresa_id, data_emissao DESC, created_at DESC);
CREATE INDEX empresa_regras_tributarias_empresa_idx ON public.empresa_regras_tributarias USING btree (empresa_id, inicio_vigencia DESC);
CREATE INDEX estoque_empresa_descricao_idx ON public.estoque USING btree (empresa_id, descricao);
CREATE INDEX estoque_empresa_disponivel_idx ON public.estoque USING btree (empresa_id, estoque_disponivel);
CREATE INDEX estoque_mov_empresa_data_idx ON public.estoque_movimentacoes USING btree (empresa_id, created_at DESC);
CREATE INDEX estoque_mov_item_data_idx ON public.estoque_movimentacoes USING btree (estoque_id, created_at DESC);
CREATE UNIQUE INDEX estoque_mov_operacao_unica_idx ON public.estoque_movimentacoes USING btree (empresa_id, tipo, origem, origem_id) WHERE ((origem_id IS NOT NULL) AND (tipo = ANY (ARRAY['Entrada'::text, 'Saída'::text])));
CREATE UNIQUE INDEX estoque_mov_reversao_unica_idx ON public.estoque_movimentacoes USING btree (reversao_de) WHERE (reversao_de IS NOT NULL);
CREATE INDEX financeiro_baixas_empresa_data_idx ON public.financeiro_baixas USING btree (empresa_id, data_movimento DESC);
CREATE UNIQUE INDEX financeiro_baixas_empresa_idempotency_key ON public.financeiro_baixas USING btree (empresa_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE UNIQUE INDEX financeiro_baixas_estorno_unico_idx ON public.financeiro_baixas USING btree (estorno_de) WHERE (estorno_de IS NOT NULL);
CREATE INDEX financeiro_baixas_titulo_idx ON public.financeiro_baixas USING btree (titulo_id, created_at DESC);
CREATE UNIQUE INDEX financeiro_categorias_empresa_nome_uidx ON public.financeiro_categorias USING btree (empresa_id, lower(btrim(nome))) WHERE (proprietario_id IS NULL);
CREATE INDEX financeiro_categorias_owner_idx ON public.financeiro_categorias USING btree (proprietario_id, empresa_id) WHERE (proprietario_id IS NOT NULL);
CREATE UNIQUE INDEX financeiro_categorias_pessoal_nome_uidx ON public.financeiro_categorias USING btree (empresa_id, proprietario_id, lower(btrim(nome))) WHERE (proprietario_id IS NOT NULL);
CREATE UNIQUE INDEX financeiro_conciliacoes_empresa_idempotency_key ON public.financeiro_conciliacoes USING btree (empresa_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX financeiro_conciliacoes_empresa_status_idx ON public.financeiro_conciliacoes USING btree (empresa_id, status, data_movimento DESC);
CREATE INDEX financeiro_historico_titulo_idx ON public.financeiro_historico USING btree (titulo_id, created_at DESC);
CREATE INDEX financeiro_recorrencias_empresa_ativas_idx ON public.financeiro_recorrencias USING btree (empresa_id, escopo, ativo, data_inicio, data_fim);
CREATE INDEX financeiro_recorrencias_owner_idx ON public.financeiro_recorrencias USING btree (proprietario_id, empresa_id) WHERE (proprietario_id IS NOT NULL);
CREATE INDEX financeiro_titulos_empresa_tipo_status_idx ON public.financeiro_titulos USING btree (empresa_id, tipo, status);
CREATE INDEX financeiro_titulos_empresa_vencimento_idx ON public.financeiro_titulos USING btree (empresa_id, vencimento);
CREATE INDEX financeiro_titulos_origem_idx ON public.financeiro_titulos USING btree (empresa_id, origem, origem_id) WHERE (origem_id IS NOT NULL);
CREATE UNIQUE INDEX financeiro_titulos_recorrencia_competencia_uidx ON public.financeiro_titulos USING btree (empresa_id, recorrencia_id, competencia) WHERE (recorrencia_id IS NOT NULL);
CREATE INDEX fornecedores_empresa_id_idx ON public.fornecedores USING btree (empresa_id);
CREATE INDEX ia_comercial_historico_empresa_user_idx ON public.ia_comercial_historico USING btree (empresa_id, user_id, created_at DESC);
CREATE INDEX idx_lancamentos_data ON public.lancamentos USING btree (created_at DESC);
CREATE INDEX idx_lancamentos_empresa ON public.lancamentos USING btree (empresa_id);
CREATE INDEX inventarios_empresa_data_idx ON public.inventarios USING btree (empresa_id, data_inicio DESC);
CREATE UNIQUE INDEX lancamentos_empresa_idempotency_key ON public.lancamentos USING btree (empresa_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX operacao_apontamentos_alocacao_idx ON public.ordem_producao_operacao_apontamentos USING btree (empresa_id, alocacao_id, ocorrido_em DESC);
CREATE INDEX operacao_resultados_alocacao_idx ON public.ordem_producao_operacao_resultados USING btree (empresa_id, alocacao_id, ocorrido_em DESC);
CREATE INDEX orcamento_aprovacoes_orcamento_idx ON public.orcamento_aprovacoes USING btree (orcamento_id, created_at DESC);
CREATE INDEX orcamento_historico_orcamento_idx ON public.orcamento_historico USING btree (orcamento_id, created_at DESC);
CREATE INDEX orcamento_itens_orcamento_idx ON public.orcamento_itens USING btree (orcamento_id);
CREATE INDEX orcamentos_empresa_data_idx ON public.orcamentos USING btree (empresa_id, data DESC);
CREATE INDEX orcamentos_empresa_status_idx ON public.orcamentos USING btree (empresa_id, status);
CREATE INDEX orcamentos_oportunidade_idx ON public.orcamentos USING btree (oportunidade_id) WHERE (oportunidade_id IS NOT NULL);
CREATE INDEX orcamentos_pessoais_owner_competencia_idx ON public.orcamentos_pessoais_mensais USING btree (proprietario_id, empresa_id, competencia);
CREATE INDEX ordem_apontamentos_ordem_idx ON public.ordem_producao_apontamentos USING btree (ordem_id, created_at DESC);
CREATE INDEX ordem_historico_ordem_idx ON public.ordem_producao_historico USING btree (ordem_id, created_at DESC);
CREATE INDEX ordem_materiais_ordem_idx ON public.ordem_producao_materiais USING btree (ordem_id);
CREATE INDEX ordem_producao_custos_empresa_idx ON public.ordem_producao_custos USING btree (empresa_id, created_at DESC);
CREATE INDEX ordem_producao_custos_ordem_idx ON public.ordem_producao_custos USING btree (ordem_id, data DESC);
CREATE INDEX ordem_recursos_empresa_idx ON public.ordem_producao_recursos USING btree (empresa_id, recurso_id, sequencia);
CREATE INDEX ordens_producao_empresa_previsao_idx ON public.ordens_producao USING btree (empresa_id, data_prevista_inicio, data_prevista_fim);
CREATE INDEX ordens_producao_empresa_status_idx ON public.ordens_producao USING btree (empresa_id, status);
CREATE INDEX ordens_producao_origem_idx ON public.ordens_producao USING btree (empresa_id, venda_id, orcamento_id);
CREATE UNIQUE INDEX pedido_compra_historico_empresa_idempotency_key ON public.pedido_compra_historico USING btree (empresa_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX pedido_cotacoes_pedido_idx ON public.pedido_compra_cotacoes USING btree (pedido_id, valor_total, prazo_dias);
CREATE INDEX pedido_followups_empresa_pedido_idx ON public.pedido_compra_followups USING btree (empresa_id, pedido_id, contatado_em DESC);
CREATE INDEX pedido_historico_pedido_idx ON public.pedido_compra_historico USING btree (pedido_id, created_at DESC);
CREATE INDEX pedido_itens_pedido_idx ON public.pedido_compra_itens USING btree (pedido_id);
CREATE INDEX pedido_parcelas_empresa_vencimento_idx ON public.pedido_compra_parcelas USING btree (empresa_id, vencimento);
CREATE INDEX pedidos_compra_empresa_data_idx ON public.pedidos_compra USING btree (empresa_id, data DESC);
CREATE INDEX pedidos_compra_empresa_status_idx ON public.pedidos_compra USING btree (empresa_id, status);
CREATE INDEX prospeccao_interacoes_prospecto_data_idx ON public.prospeccao_interacoes USING btree (empresa_id, prospecto_id, data_hora DESC);
CREATE UNIQUE INDEX prospeccao_prospectos_empresa_oportunidade_idx ON public.prospeccao_prospectos USING btree (empresa_id, oportunidade_id) WHERE (oportunidade_id IS NOT NULL);
CREATE INDEX prospeccao_prospectos_empresa_retorno_idx ON public.prospeccao_prospectos USING btree (empresa_id, proximo_retorno_em);
CREATE INDEX prospeccao_prospectos_empresa_status_idx ON public.prospeccao_prospectos USING btree (empresa_id, status);
CREATE INDEX recurso_indisponibilidades_idx ON public.recurso_producao_indisponibilidades USING btree (empresa_id, recurso_id, inicio, fim);
CREATE INDEX recursos_producao_empresa_idx ON public.recursos_producao USING btree (empresa_id, ativo);
CREATE UNIQUE INDEX vendas_empresa_idempotency_key ON public.vendas USING btree (empresa_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
-- K. Views finais, endurecidas como security_invoker.
create view public.relatorio_anual with (security_invoker = true) as
 SELECT usuario_id,
    ano,
    sum(
        CASE
            WHEN tipo = 'receita'::text THEN valor
            ELSE 0::numeric
        END) AS total_receitas,
    sum(
        CASE
            WHEN tipo = 'despesa'::text THEN valor
            ELSE 0::numeric
        END) AS total_despesas,
    sum(
        CASE
            WHEN tipo = 'receita'::text THEN valor
            ELSE 0::numeric
        END) - sum(
        CASE
            WHEN tipo = 'despesa'::text THEN valor
            ELSE 0::numeric
        END) AS resultado
   FROM lancamentos
  GROUP BY usuario_id, ano;;

create view public.relatorio_mensal with (security_invoker = true) as
 SELECT usuario_id,
    ano,
    mes,
    sum(
        CASE
            WHEN tipo = 'receita'::text THEN valor
            ELSE 0::numeric
        END) AS total_receitas,
    sum(
        CASE
            WHEN tipo = 'despesa'::text THEN valor
            ELSE 0::numeric
        END) AS total_despesas,
    sum(
        CASE
            WHEN tipo = 'receita'::text THEN valor
            ELSE 0::numeric
        END) - sum(
        CASE
            WHEN tipo = 'despesa'::text THEN valor
            ELSE 0::numeric
        END) AS resultado
   FROM lancamentos
  GROUP BY usuario_id, ano, mes;;

-- L. Funcoes/RPCs finais. Funcoes de provisionamento Auth foram excluidas.
-- Compatibilidade endurecida: role='master' isoladamente nunca autoriza.
create or replace function public.usuario_eh_master()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select public.usuario_eh_master_global();
$$;

revoke all on function public.usuario_eh_master() from public, anon;
grant execute on function public.usuario_eh_master() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.alterar_status_pedido_compra(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_novo_status text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_pedido public.pedidos_compra;
  v_tipo text;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Usuário divergente da sessão autenticada.' using errcode='42501'; end if;
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode='42501';
  end if;
  select * into v_pedido from public.pedidos_compra where id=p_pedido_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Pedido não encontrado para a empresa atual.'; end if;
  if not (case v_pedido.status
    when 'Rascunho' then p_novo_status in ('Solicitado','Cancelado')
    when 'Solicitado' then p_novo_status in ('Rascunho','Em cotação','Cancelado')
    when 'Em cotação' then p_novo_status in ('Solicitado','Aprovado','Cancelado')
    when 'Aprovado' then p_novo_status in ('Em cotação','Comprado','Cancelado')
    when 'Comprado' then p_novo_status='Cancelado'
    else false end) then
    raise exception 'Transição de status não permitida: % para %.',v_pedido.status,p_novo_status;
  end if;

  update public.pedidos_compra set status=p_novo_status,updated_at=now(),
    aprovado_por=case when p_novo_status='Aprovado' then p_user_id else aprovado_por end,
    aprovado_em=case when p_novo_status='Aprovado' then now() else aprovado_em end
  where id=p_pedido_id and empresa_id=p_empresa_id;
  v_tipo:=case p_novo_status when 'Solicitado' then 'Solicitação' when 'Em cotação' then 'Cotação' when 'Aprovado' then 'Aprovação' when 'Comprado' then 'Compra' when 'Cancelado' then 'Cancelamento' else 'Edição' end;
  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(p_pedido_id,p_empresa_id,p_user_id,v_tipo,'Status alterado de '||v_pedido.status||' para '||p_novo_status||'.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.apontar_resultado_operacao_producao(p_empresa_id uuid, p_alocacao_id uuid, p_quantidade_boa numeric, p_quantidade_refugada numeric, p_operador text, p_motivo_refugo text, p_ocorrido_em timestamp with time zone, p_observacoes text, p_idempotency_key uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_pedido_compra_completo(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_pedido jsonb, p_itens jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_pedido public.pedidos_compra;
begin
  if p_empresa_id is null then
    raise exception 'Empresa é obrigatória.';
  end if;
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Usuário divergente da sessão autenticada.' using errcode = '42501';
  end if;
  if not exists(select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode = '42501';
  end if;
  select * into v_pedido from public.pedidos_compra where id = p_pedido_id and empresa_id = p_empresa_id for update;
  if not found then
    raise exception 'Pedido não encontrado para a empresa atual.';
  end if;
  if exists(select 1 from public.pedido_compra_itens where pedido_id = p_pedido_id and empresa_id = p_empresa_id and quantidade_recebida > 0) then
    raise exception 'Pedido com recebimento não pode ter seus itens reeditados.';
  end if;
  if nullif(btrim(p_pedido->>'fornecedor_id'), '') is null or nullif(btrim(p_pedido->>'numero'), '') is null or nullif(p_pedido->>'data', '') is null then
    raise exception 'Fornecedor, número e data são obrigatórios.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido deve possuir ao menos um item válido.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_itens) as i(produto_id text, produto text, quantidade numeric, valor_unitario numeric)
    where nullif(btrim(i.produto_id), '') is null or nullif(btrim(i.produto), '') is null or i.quantidade <= 0 or i.valor_unitario < 0
  ) then
    raise exception 'Há itens inválidos no pedido.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_itens) as i(produto_id text)
    group by i.produto_id having count(*) > 1
  ) then
    raise exception 'O mesmo produto não pode ser duplicado no pedido.';
  end if;
  if exists(
    select 1
    from jsonb_to_recordset(p_itens) as i(estoque_id text)
    where nullif(btrim(i.estoque_id), '') is not null
      and not exists(
        select 1 from public.estoque e
        where e.id = btrim(i.estoque_id)::uuid
          and e.empresa_id = p_empresa_id
      )
  ) then
    raise exception 'Há item vinculado a estoque inexistente ou de outra empresa.';
  end if;

  update public.pedidos_compra set
    fornecedor_id=p_pedido->>'fornecedor_id',fornecedor_snapshot=coalesce(p_pedido->'fornecedor_snapshot','{}'::jsonb),
    numero=p_pedido->>'numero',status=coalesce(nullif(p_pedido->>'status',''),'Rascunho'),data=(p_pedido->>'data')::date,
    previsao=nullif(p_pedido->>'previsao','')::date,condicao_pagamento=nullif(p_pedido->>'condicao_pagamento',''),
    transportadora=nullif(p_pedido->>'transportadora',''),frete=coalesce((p_pedido->>'frete')::numeric,0),
    desconto=coalesce((p_pedido->>'desconto')::numeric,0),observacoes=nullif(p_pedido->>'observacoes',''),
    valor_total=coalesce((p_pedido->>'valor_total')::numeric,0),updated_at=now()
  where id=p_pedido_id and empresa_id=p_empresa_id;

  delete from public.pedido_compra_itens where pedido_id=p_pedido_id and empresa_id=p_empresa_id;
  insert into public.pedido_compra_itens(
    pedido_id,empresa_id,produto_id,estoque_id,produto,descricao,liga,tempera,dimensao,peso,
    quantidade,unidade,valor_unitario,subtotal,comissao,dados_catalogo
  )
  select p_pedido_id,p_empresa_id,i.produto_id,nullif(i.estoque_id,'')::uuid,i.produto,i.descricao,i.liga,i.tempera,i.dimensao,
    coalesce(i.peso,0),i.quantidade,coalesce(nullif(i.unidade,''),'kg'),i.valor_unitario,i.subtotal,coalesce(i.comissao,0),coalesce(i.dados_catalogo,'{}'::jsonb)
  from jsonb_to_recordset(p_itens) as i(
    produto_id text,estoque_id text,produto text,descricao text,liga text,tempera text,dimensao text,peso numeric,
    quantidade numeric,unidade text,valor_unitario numeric,subtotal numeric,comissao numeric,dados_catalogo jsonb
  );

  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(p_pedido_id,p_empresa_id,p_user_id,'Edição','Cabeçalho e itens sincronizados em uma única transação.');
  return p_pedido_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.baixar_reserva_estoque(p_estoque_id uuid, p_empresa_id uuid, p_quantidade numeric, p_venda_id text, p_orcamento_id text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501'; end if;
  perform public.movimentar_estoque(p_estoque_id,p_empresa_id,'Liberação',p_quantidade,'Orçamento',p_orcamento_id,'Reserva convertida em venda.',null,null);
  perform public.movimentar_estoque(p_estoque_id,p_empresa_id,'Saída',p_quantidade,'Venda',p_venda_id,'Baixa de reserva após venda confirmada.',null,null);
END;
$function$;

CREATE OR REPLACE FUNCTION public.baixar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_titulo public.financeiro_titulos;v_novo numeric;v_baixa uuid;v_tipo text;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501'; end if;
  select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id for update;
  if not found or v_titulo.status='Cancelado' then raise exception 'Título não encontrado ou cancelado.'; end if;
  if p_valor<=0 or p_valor>v_titulo.saldo then raise exception 'Valor de baixa inválido.'; end if;
  v_novo:=v_titulo.valor_baixado+p_valor;v_tipo:=case when v_novo<v_titulo.valor_original then 'Baixa parcial' else 'Baixa' end;
  update public.financeiro_titulos set valor_baixado=v_novo,status=case when v_novo=v_titulo.valor_original then 'Liquidado' else 'Parcial' end,data_liquidacao=case when v_novo=v_titulo.valor_original then p_data else null end,forma_pagamento=p_forma,conta=p_conta,updated_at=now() where id=p_titulo_id and empresa_id=p_empresa_id;
  insert into public.financeiro_baixas(titulo_id,empresa_id,user_id,tipo,valor,valor_baixado_anterior,valor_baixado_resultante,saldo_resultante,data_movimento,forma_pagamento,conta,observacoes)
  values(p_titulo_id,p_empresa_id,auth.uid(),'Baixa',p_valor,v_titulo.valor_baixado,v_novo,v_titulo.valor_original-v_novo,p_data,p_forma,p_conta,p_observacoes) returning id into v_baixa;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(p_titulo_id,p_empresa_id,auth.uid(),v_tipo,'Baixa financeira registrada.',jsonb_build_object('baixa_id',v_baixa,'valor',p_valor,'saldo',v_titulo.valor_original-v_novo));
  return v_baixa;
END;
$function$;

CREATE OR REPLACE FUNCTION public.baixar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text, p_idempotency_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.baixar_titulo_financeiro_interno_v1(p_titulo_id,p_empresa_id,p_valor,p_data,p_forma,p_conta,p_observacoes,p_idempotency_key);
END;
$function$;

CREATE OR REPLACE FUNCTION public.baixar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text, p_idempotency_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_titulo public.financeiro_titulos;v_novo numeric;v_baixa uuid;v_tipo text;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_idempotency_key is null then raise exception 'Chave de idempotência obrigatória.';end if;
 select id into v_baixa from public.financeiro_baixas where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;if v_baixa is not null then return v_baixa;end if;
 select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id for update;
 if not found or v_titulo.status='Cancelado' then raise exception 'Título não encontrado ou cancelado.';end if;
 select id into v_baixa from public.financeiro_baixas where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;if v_baixa is not null then return v_baixa;end if;
 if p_valor<=0 or p_valor>v_titulo.saldo then raise exception 'Valor de baixa inválido.';end if;
 v_novo:=v_titulo.valor_baixado+p_valor;v_tipo:=case when v_novo<v_titulo.valor_original then 'Baixa parcial' else 'Baixa' end;
 update public.financeiro_titulos set valor_baixado=v_novo,status=case when v_novo=v_titulo.valor_original then 'Liquidado' else 'Parcial' end,data_liquidacao=case when v_novo=v_titulo.valor_original then p_data else null end,forma_pagamento=p_forma,conta=p_conta,updated_at=now() where id=p_titulo_id and empresa_id=p_empresa_id;
 insert into public.financeiro_baixas(titulo_id,empresa_id,user_id,tipo,valor,valor_baixado_anterior,valor_baixado_resultante,saldo_resultante,data_movimento,forma_pagamento,conta,observacoes,idempotency_key) values(p_titulo_id,p_empresa_id,auth.uid(),'Baixa',p_valor,v_titulo.valor_baixado,v_novo,v_titulo.valor_original-v_novo,p_data,p_forma,p_conta,p_observacoes,p_idempotency_key) returning id into v_baixa;
 insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(p_titulo_id,p_empresa_id,auth.uid(),v_tipo,'Baixa financeira registrada.',jsonb_build_object('baixa_id',v_baixa,'valor',p_valor));return v_baixa;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cf_pode_alterar_tributario(p_empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.usuarios u
    where u.id = (select auth.uid())
      and u.empresa_id = p_empresa_id
      and u.status = 'ATIVO'
      and (u.role = 'cliente' or coalesce(u.master_admin, false))
  );
$function$;

CREATE OR REPLACE FUNCTION public.conciliar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_titulo public.financeiro_titulos;v_id uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501'; end if;
  select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id;
  if not found then raise exception 'Título não encontrado.'; end if;
  if p_valor<=0 or p_status not in ('Pendente','Conciliado','Divergente') then raise exception 'Dados de conciliação inválidos.'; end if;
  insert into public.financeiro_conciliacoes(titulo_id,empresa_id,user_id,conta,data_movimento,valor,status,observacoes)
  values(p_titulo_id,p_empresa_id,auth.uid(),p_conta,p_data,p_valor,p_status,p_observacoes) returning id into v_id;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados)
  values(p_titulo_id,p_empresa_id,auth.uid(),'Conciliação','Conciliação manual registrada.',jsonb_build_object('conciliacao_id',v_id,'status',p_status,'conta',p_conta,'valor',p_valor));
  return v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.conciliar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text, p_idempotency_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.conciliar_titulo_financeiro_interno_v1(p_titulo_id,p_empresa_id,p_conta,p_data,p_valor,p_status,p_observacoes,p_idempotency_key);
END;
$function$;

CREATE OR REPLACE FUNCTION public.conciliar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text, p_idempotency_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_idempotency_key is null then raise exception 'Chave de idempotência obrigatória.';end if;
 if not exists(select 1 from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id) then raise exception 'Título não encontrado.';end if;
 if p_valor<=0 or p_status not in ('Pendente','Conciliado','Divergente') then raise exception 'Dados de conciliação inválidos.';end if;
 insert into public.financeiro_conciliacoes(titulo_id,empresa_id,user_id,conta,data_movimento,valor,status,observacoes,idempotency_key)
 values(p_titulo_id,p_empresa_id,auth.uid(),p_conta,p_data,p_valor,p_status,p_observacoes,p_idempotency_key)
 on conflict(empresa_id,idempotency_key) where idempotency_key is not null do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.financeiro_conciliacoes where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;return v_id;end if;
 insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(p_titulo_id,p_empresa_id,auth.uid(),'Conciliação','Conciliação manual registrada.',jsonb_build_object('conciliacao_id',v_id));return v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmar_recebimento(p_recebimento_id uuid, p_empresa_id uuid, p_idempotency_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.confirmar_recebimento_interno_v1(p_recebimento_id,p_empresa_id,p_idempotency_key);
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmar_recebimento_interno_v1(p_recebimento_id uuid, p_empresa_id uuid, p_idempotency_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_recebimento public.recebimentos;v_lancamento uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_idempotency_key is null then raise exception 'Chave de idempotência obrigatória.';end if;
 select id into v_lancamento from public.lancamentos where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key;
 if v_lancamento is not null then return v_lancamento;end if;
 select * into v_recebimento from public.recebimentos where id=p_recebimento_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Recebimento não encontrado.';end if;
 update public.recebimentos set status='pago',updated_at=now() where id=p_recebimento_id and empresa_id=p_empresa_id;
 insert into public.lancamentos(empresa_id,user_id,recebimento_id,tipo,descricao,valor,ano,mes,data,status,idempotency_key)
 values(p_empresa_id,auth.uid(),p_recebimento_id,'receita','Recebimento confirmado',v_recebimento.valor,extract(year from current_date)::integer,extract(month from current_date)::integer,current_date,'recebido',p_idempotency_key)
 on conflict(empresa_id,idempotency_key) where idempotency_key is not null do update set idempotency_key=excluded.idempotency_key returning id into v_lancamento;
 return v_lancamento;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consumir_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_usar_reserva numeric;v_sem_reserva numeric;v_novo numeric;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Material não encontrado.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id and status in ('Em produção','Pausada') for update;
 if not found then raise exception 'OP não está em produção.';end if;
 v_novo:=v_material.quantidade_consumida+p_quantidade;
 if v_novo>v_material.quantidade_prevista then raise exception 'Consumo acima da necessidade prevista.';end if;
 v_usar_reserva:=least(p_quantidade,v_material.quantidade_reservada);
 v_sem_reserva:=p_quantidade-v_usar_reserva;
 if v_usar_reserva>0 then
   perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Liberação',v_usar_reserva,'Produção','consumo-liberacao:'||v_material.id::text||':'||v_novo::text,'Reserva liberada para consumo confirmado da '||v_ordem.numero_op,null,null);
 end if;
 -- Após liberar a reserva, todo o consumo fica disponível e pode ser baixado pelo serviço central.
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Saída',p_quantidade,'Produção','consumo:'||v_material.id::text||':'||v_novo::text,'Consumo real confirmado da '||v_ordem.numero_op,null,null);
 update public.ordem_producao_materiais set quantidade_reservada=quantidade_reservada-v_usar_reserva,quantidade_consumida=v_novo,updated_at=now() where id=v_material.id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados)
 values(v_ordem.id,p_empresa_id,auth.uid(),'Consumo','Consumo real enviado ao estoque após confirmação.',jsonb_build_object('material_id',v_material.id,'quantidade',p_quantidade,'usou_reserva',v_usar_reserva,'sem_reserva',v_sem_reserva));
END;
$function$;

CREATE OR REPLACE FUNCTION public.contas_pagar_pessoais_set_atualizado_em()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.atualizado_em = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.converter_prospecto_comercial(p_prospecto_id uuid)
 RETURNS TABLE(cliente_id uuid, oportunidade_id uuid, cliente_reutilizado boolean, oportunidade_reutilizada boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_prospect public.prospeccao_prospectos%rowtype;
  v_cliente_id uuid;
  v_oportunidade_id uuid;
  v_cliente_reutilizado boolean := false;
  v_oportunidade_reutilizada boolean := false;
  v_documento text;
  v_email text;
  v_telefone text;
begin
  select p.* into v_prospect
  from public.prospeccao_prospectos p
  where p.id = p_prospecto_id
  for update;

  if not found then raise exception 'Prospecto não encontrado na empresa ativa'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_prospect.empresa_id::text, 0));
  v_documento := pg_catalog.regexp_replace(coalesce(v_prospect.dados->>'cnpj', ''), '\D', '', 'g');
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(v_prospect.dados->>'email', '')));
  v_telefone := pg_catalog.regexp_replace(coalesce(nullif(v_prospect.dados->>'telefone', ''), v_prospect.dados->>'whatsapp', ''), '\D', '', 'g');

  select c.id into v_cliente_id
  from public.clientes c
  where c.empresa_id = v_prospect.empresa_id
    and ((v_documento <> '' and pg_catalog.regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') = v_documento)
      or (v_email <> '' and pg_catalog.lower(pg_catalog.btrim(coalesce(c.email, ''))) = v_email)
      or (v_telefone <> '' and (pg_catalog.regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g') = v_telefone
        or pg_catalog.regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g') = v_telefone)))
  order by c.created_at nulls last, c.id limit 1;

  if v_cliente_id is null then
    insert into public.clientes (empresa_id, user_id, nome, email, telefone, whatsapp, cpf, ativo)
    values (v_prospect.empresa_id, (select auth.uid()),
      coalesce(nullif(v_prospect.dados->>'nomeFantasia', ''), nullif(v_prospect.dados->>'razaoSocial', ''), 'Prospecto convertido'),
      nullif(v_prospect.dados->>'email', ''), nullif(v_prospect.dados->>'telefone', ''),
      nullif(v_prospect.dados->>'whatsapp', ''), nullif(v_prospect.dados->>'cnpj', ''), true)
    returning id into v_cliente_id;
  else
    v_cliente_reutilizado := true;
  end if;

  v_oportunidade_id := v_prospect.oportunidade_id;
  if v_oportunidade_id is null then
    insert into public.crm_oportunidades (
      empresa_id, user_id, cliente_id, cliente_nome, empresa_cliente, telefone, whatsapp, email,
      cidade, estado, pais, origem, segmento, produto_material, etapa, prioridade, responsavel, observacoes
    ) values (
      v_prospect.empresa_id, (select auth.uid()), v_cliente_id, nullif(v_prospect.dados->>'contatoNome', ''),
      coalesce(nullif(v_prospect.dados->>'nomeFantasia', ''), nullif(v_prospect.dados->>'razaoSocial', ''), 'Prospecto convertido'),
      nullif(v_prospect.dados->>'telefone', ''), nullif(v_prospect.dados->>'whatsapp', ''), nullif(v_prospect.dados->>'email', ''),
      nullif(v_prospect.dados->>'cidade', ''), nullif(v_prospect.dados->>'estado', ''), nullif(v_prospect.dados->>'pais', ''),
      nullif(v_prospect.dados->>'origem', ''), nullif(v_prospect.dados->>'segmento', ''), nullif(v_prospect.dados->>'necessidade', ''),
      'Qualificação', coalesce(nullif(v_prospect.dados->>'retornoPrioridade', ''), 'Média'),
      nullif(v_prospect.dados->>'responsavel', ''), nullif(v_prospect.dados->>'observacoes', ''))
    returning id into v_oportunidade_id;
  else
    v_oportunidade_reutilizada := true;
    update public.crm_oportunidades o set cliente_id = v_cliente_id
    where o.id = v_oportunidade_id and o.empresa_id = v_prospect.empresa_id
      and (o.cliente_id is null or o.cliente_id = v_cliente_id);
    if not found then raise exception 'Oportunidade vinculada a outro cliente ou fora da empresa ativa'; end if;
  end if;

  update public.prospeccao_prospectos p
  set convertido_cliente_id = v_cliente_id, convertido_em = coalesce(p.convertido_em, pg_catalog.now()),
      oportunidade_id = v_oportunidade_id, status = 'Convertido em cliente', arquivado = false, updated_at = pg_catalog.now()
  where p.id = v_prospect.id and p.empresa_id = v_prospect.empresa_id;

  return query select v_cliente_id, v_oportunidade_id, v_cliente_reutilizado, v_oportunidade_reutilizada;
end;
$function$;

CREATE OR REPLACE FUNCTION public.criar_pedido_compra_completo(p_empresa_id uuid, p_user_id uuid, p_pedido jsonb, p_itens jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_pedido_id uuid;
begin
  if p_empresa_id is null then
    raise exception 'Empresa é obrigatória.';
  end if;
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Usuário divergente da sessão autenticada.' using errcode = '42501';
  end if;
  if not exists(select 1 from public.usuarios u where u.id = auth.uid() and u.empresa_id = p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode = '42501';
  end if;
  if nullif(btrim(p_pedido->>'fornecedor_id'), '') is null or nullif(btrim(p_pedido->>'numero'), '') is null or nullif(p_pedido->>'data', '') is null then
    raise exception 'Fornecedor, número e data são obrigatórios.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido deve possuir ao menos um item válido.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_itens) as i(produto_id text, produto text, quantidade numeric, valor_unitario numeric)
    where nullif(btrim(i.produto_id), '') is null or nullif(btrim(i.produto), '') is null or i.quantidade <= 0 or i.valor_unitario < 0
  ) then
    raise exception 'Há itens inválidos no pedido.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_itens) as i(produto_id text)
    group by i.produto_id having count(*) > 1
  ) then
    raise exception 'O mesmo produto não pode ser duplicado no pedido.';
  end if;
  if exists(
    select 1
    from jsonb_to_recordset(p_itens) as i(estoque_id text)
    where nullif(btrim(i.estoque_id), '') is not null
      and not exists(
        select 1 from public.estoque e
        where e.id = btrim(i.estoque_id)::uuid
          and e.empresa_id = p_empresa_id
      )
  ) then
    raise exception 'Há item vinculado a estoque inexistente ou de outra empresa.';
  end if;

  insert into public.pedidos_compra(
    empresa_id,user_id,fornecedor_id,fornecedor_snapshot,numero,status,data,previsao,
    condicao_pagamento,transportadora,frete,desconto,observacoes,valor_total
  ) values (
    p_empresa_id,p_user_id,p_pedido->>'fornecedor_id',coalesce(p_pedido->'fornecedor_snapshot','{}'::jsonb),
    p_pedido->>'numero',coalesce(nullif(p_pedido->>'status',''),'Rascunho'),(p_pedido->>'data')::date,
    nullif(p_pedido->>'previsao','')::date,nullif(p_pedido->>'condicao_pagamento',''),nullif(p_pedido->>'transportadora',''),
    coalesce((p_pedido->>'frete')::numeric,0),coalesce((p_pedido->>'desconto')::numeric,0),nullif(p_pedido->>'observacoes',''),
    coalesce((p_pedido->>'valor_total')::numeric,0)
  ) returning id into v_pedido_id;

  insert into public.pedido_compra_itens(
    pedido_id,empresa_id,produto_id,estoque_id,produto,descricao,liga,tempera,dimensao,peso,
    quantidade,unidade,valor_unitario,subtotal,comissao,dados_catalogo
  )
  select v_pedido_id,p_empresa_id,i.produto_id,nullif(i.estoque_id,'')::uuid,i.produto,i.descricao,i.liga,i.tempera,i.dimensao,
    coalesce(i.peso,0),i.quantidade,coalesce(nullif(i.unidade,''),'kg'),i.valor_unitario,i.subtotal,coalesce(i.comissao,0),coalesce(i.dados_catalogo,'{}'::jsonb)
  from jsonb_to_recordset(p_itens) as i(
    produto_id text,estoque_id text,produto text,descricao text,liga text,tempera text,dimensao text,peso numeric,
    quantidade numeric,unidade text,valor_unitario numeric,subtotal numeric,comissao numeric,dados_catalogo jsonb
  );

  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(v_pedido_id,p_empresa_id,p_user_id,'Criação','Pedido, itens e histórico criados em uma única transação.');
  return v_pedido_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.crm_protect_opportunity_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if auth.uid() is not null
     and (
       new.empresa_id is distinct from old.empresa_id
       or new.user_id is distinct from old.user_id
     ) then

    raise exception
      'Tenant e autoria da oportunidade nao podem ser alterados';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.editar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_contraparte_nome text, p_referencia text, p_descricao text, p_categoria text, p_centro_custo text, p_vencimento date, p_observacoes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  perform public.editar_titulo_financeiro_interno_v1(p_titulo_id,p_empresa_id,p_contraparte_nome,p_referencia,p_descricao,p_categoria,p_centro_custo,p_vencimento,p_observacoes);
END;
$function$;

CREATE OR REPLACE FUNCTION public.editar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_contraparte_nome text, p_referencia text, p_descricao text, p_categoria text, p_centro_custo text, p_vencimento date, p_observacoes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_titulo public.financeiro_titulos;v_tipo text;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501'; end if;
  select * into v_titulo from public.financeiro_titulos where id=p_titulo_id and empresa_id=p_empresa_id for update;
  if not found or v_titulo.status='Cancelado' then raise exception 'Título não encontrado ou cancelado.'; end if;
  v_tipo:=case when v_titulo.vencimento<>p_vencimento then 'Vencimento' else 'Edição' end;
  update public.financeiro_titulos set contraparte_nome=p_contraparte_nome,referencia=p_referencia,descricao=p_descricao,
    categoria=p_categoria,centro_custo=p_centro_custo,vencimento=p_vencimento,observacoes=p_observacoes,updated_at=now() where id=p_titulo_id and empresa_id=p_empresa_id;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados)
  values(p_titulo_id,p_empresa_id,auth.uid(),v_tipo,'Dados do título financeiro editados.',jsonb_build_object('vencimento_anterior',v_titulo.vencimento,'vencimento_novo',p_vencimento));
END;
$function$;

CREATE OR REPLACE FUNCTION public.entrar_produto_acabado(p_ordem_id uuid, p_empresa_id uuid, p_estoque_id uuid, p_quantidade numeric)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ordem public.ordens_producao;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_ordem from public.ordens_producao where id=p_ordem_id and empresa_id=p_empresa_id and status='Concluída' for update;
 if not found or v_ordem.entrada_produto_acabado_em is not null then raise exception 'OP não concluída ou entrada já realizada.';end if;
 perform public.movimentar_estoque(p_estoque_id,p_empresa_id,'Entrada',p_quantidade,'Produção','produto-acabado:'||p_ordem_id::text,'Entrada confirmada do produto acabado da '||v_ordem.numero_op,null,null);
 update public.ordens_producao set produto_acabado_estoque_id=p_estoque_id,entrada_produto_acabado_em=now(),updated_at=now() where id=p_ordem_id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(p_ordem_id,p_empresa_id,auth.uid(),'Produto acabado','Entrada do produto acabado confirmada.',jsonb_build_object('estoque_id',p_estoque_id,'quantidade',p_quantidade));
END;
$function$;

CREATE OR REPLACE FUNCTION public.estornar_baixa_financeira(p_baixa_id uuid, p_empresa_id uuid, p_data date, p_observacoes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.estornar_baixa_financeira_interno_v1(p_baixa_id,p_empresa_id,p_data,p_observacoes);
END;
$function$;

CREATE OR REPLACE FUNCTION public.estornar_baixa_financeira_interno_v1(p_baixa_id uuid, p_empresa_id uuid, p_data date, p_observacoes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_baixa public.financeiro_baixas;v_titulo public.financeiro_titulos;v_novo numeric;v_estorno uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501'; end if;
  select * into v_baixa from public.financeiro_baixas where id=p_baixa_id and empresa_id=p_empresa_id and tipo='Baixa' for update;
  if not found or exists(select 1 from public.financeiro_baixas where estorno_de=p_baixa_id and empresa_id=p_empresa_id) then raise exception 'Baixa inexistente ou já estornada.'; end if;
  select * into v_titulo from public.financeiro_titulos where id=v_baixa.titulo_id and empresa_id=p_empresa_id for update;
  v_novo:=v_titulo.valor_baixado-v_baixa.valor;if v_novo<0 then raise exception 'Estorno inconsistente.';end if;
  update public.financeiro_titulos set valor_baixado=v_novo,status=case when v_novo=0 then 'Pendente' else 'Parcial' end,data_liquidacao=null,updated_at=now() where id=v_titulo.id and empresa_id=p_empresa_id;
  insert into public.financeiro_baixas(titulo_id,empresa_id,user_id,tipo,valor,valor_baixado_anterior,valor_baixado_resultante,saldo_resultante,data_movimento,forma_pagamento,conta,observacoes,estorno_de)
  values(v_titulo.id,p_empresa_id,auth.uid(),'Estorno',v_baixa.valor,v_titulo.valor_baixado,v_novo,v_titulo.valor_original-v_novo,p_data,v_baixa.forma_pagamento,v_baixa.conta,p_observacoes,p_baixa_id) returning id into v_estorno;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados) values(v_titulo.id,p_empresa_id,auth.uid(),'Estorno','Baixa financeira estornada sem exclusão do histórico.',jsonb_build_object('baixa_id',p_baixa_id,'estorno_id',v_estorno,'valor',v_baixa.valor));
  return v_estorno;
END;
$function$;

CREATE OR REPLACE FUNCTION public.excluir_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not public.cf_pode_alterar_tributario(p_empresa_id) then
    raise exception using errcode = '42501', message = 'alteracao_tributaria_nao_autorizada';
  end if;
  delete from public.empresa_notas_fiscais_tributarias
  where id = p_nota_fiscal_id and empresa_id = p_empresa_id
    and integracao_operacional is null and integrado_em is null;
  return found;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finalizar_inventario(p_inventario_id uuid, p_empresa_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_inventario public.inventarios; v_item public.inventario_itens;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501'; end if;
  select * into v_inventario from public.inventarios where id=p_inventario_id and empresa_id=p_empresa_id and status='Em contagem' for update;
  if not found then raise exception 'Inventário aberto não encontrado.'; end if;
  if exists(select 1 from public.inventario_itens where inventario_id=p_inventario_id and empresa_id=p_empresa_id and quantidade_contada is null) then raise exception 'Todas as contagens devem ser informadas.'; end if;
  for v_item in select * from public.inventario_itens where inventario_id=p_inventario_id and empresa_id=p_empresa_id and diferenca<>0 loop
    perform public.movimentar_estoque(v_item.estoque_id,p_empresa_id,'Inventário',v_item.quantidade_contada,'Inventário',p_inventario_id::text,'Ajuste após contagem confirmada.',null,null);
  end loop;
  update public.inventarios set status='Ajustado',data_conclusao=now(),updated_at=now() where id=p_inventario_id and empresa_id=p_empresa_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.financeiro_planejamento_set_atualizado_em()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.atualizado_em := now();
  return new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_titulos_recorrentes(p_competencia date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date, p_recorrencia_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(recorrencia_id uuid, titulo_id uuid, escopo text, criado boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  r public.financeiro_recorrencias;
  v_comp date;
  v_due date;
  v_id uuid;
  v_created boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  v_comp := date_trunc('month', p_competencia)::date;

  for r in
    select *
      from public.financeiro_recorrencias fr
     where fr.ativo
       and fr.gerar_automaticamente
       and fr.frequencia = 'Mensal'
       and (
         (p_recorrencia_id is not null and fr.id = p_recorrencia_id)
         or (p_recorrencia_id is null and fr.escopo = 'Empresarial')
       )
       and fr.data_inicio < (v_comp + interval '1 month')::date
       and (fr.data_fim is null or fr.data_fim >= v_comp)
       and (
         (fr.escopo = 'Pessoal' and fr.proprietario_id = (select auth.uid()))
         or (
           fr.escopo = 'Empresarial'
           and exists (
             select 1
               from public.usuarios u
              where u.id = (select auth.uid())
                and u.empresa_id = fr.empresa_id
           )
         )
       )
  loop
    v_id := null;
    v_created := false;
    v_due := make_date(
      extract(year from v_comp)::integer,
      extract(month from v_comp)::integer,
      least(
        r.dia_vencimento,
        extract(day from (v_comp + interval '1 month - 1 day'))::integer
      )
    );

    if r.escopo = 'Pessoal' then
      insert into public.contas_pagar_pessoais (
        empresa_id, proprietario_id, descricao, fornecedor, valor, vencimento,
        status, categoria, categoria_id, observacoes, recorrencia_id, competencia,
        classificacao_financeira
      )
      values (
        r.empresa_id, r.proprietario_id, r.descricao, r.contraparte,
        r.valor_previsto, v_due, 'Pendente',
        (select c.nome from public.financeiro_categorias c where c.id = r.categoria_id),
        r.categoria_id, r.observacoes, r.id, v_comp, r.classificacao
      )
      on conflict (empresa_id, proprietario_id, recorrencia_id, competencia)
        where recorrencia_id is not null
      do nothing
      returning id into v_id;
    else
      insert into public.financeiro_titulos (
        empresa_id, user_id, tipo, contraparte_nome, origem, origem_id,
        referencia, descricao, categoria, centro_custo, vencimento,
        valor_original, observacoes, recorrencia_id, competencia,
        classificacao_financeira
      )
      values (
        r.empresa_id, (select auth.uid()), 'Pagar',
        coalesce(r.contraparte, 'Fornecedor não informado'), 'Outro',
        'recorrencia:' || r.id::text || ':' || to_char(v_comp, 'YYYY-MM'),
        to_char(v_comp, 'YYYY-MM'), r.descricao,
        (select c.nome from public.financeiro_categorias c where c.id = r.categoria_id),
        r.centro_custo, v_due, r.valor_previsto, r.observacoes,
        r.id, v_comp, r.classificacao
      )
      on conflict (empresa_id, recorrencia_id, competencia)
        where recorrencia_id is not null
      do nothing
      returning id into v_id;
    end if;

    if v_id is null then
      if r.escopo = 'Pessoal' then
        select c.id
          into v_id
          from public.contas_pagar_pessoais c
         where c.empresa_id = r.empresa_id
           and c.proprietario_id = r.proprietario_id
           and c.recorrencia_id = r.id
           and c.competencia = v_comp;
      else
        select t.id
          into v_id
          from public.financeiro_titulos t
         where t.empresa_id = r.empresa_id
           and t.recorrencia_id = r.id
           and t.competencia = v_comp;
      end if;
    else
      v_created := true;
    end if;

    recorrencia_id := r.id;
    titulo_id := v_id;
    escopo := r.escopo;
    criado := v_created;
    return next;
  end loop;
END;
$function$;

CREATE OR REPLACE FUNCTION public.importar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota jsonb, p_itens jsonb, p_analise jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.liberar_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_novo numeric;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 if not found or p_quantidade>v_material.quantidade_reservada then raise exception 'Reserva insuficiente.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id for update;
 v_novo:=v_material.quantidade_reservada-p_quantidade;
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Liberação',p_quantidade,'Produção','liberacao:'||v_material.id::text||':'||v_novo::text,'Liberação confirmada da '||v_ordem.numero_op,null,null);
 update public.ordem_producao_materiais set quantidade_reservada=v_novo,updated_at=now() where id=v_material.id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(v_ordem.id,p_empresa_id,auth.uid(),'Devolução','Reserva liberada ao estoque.',jsonb_build_object('material_id',v_material.id,'quantidade',p_quantidade));
END;
$function$;

CREATE OR REPLACE FUNCTION public.materializar_despesa_evento_entrada_pessoal(p_evento_id uuid, p_empresa_id uuid, p_proprietario_id uuid)
 RETURNS despesas
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.movimentar_estoque(p_estoque_id uuid, p_empresa_id uuid, p_tipo text, p_quantidade numeric, p_origem text, p_origem_id text DEFAULT NULL::text, p_observacoes text DEFAULT NULL::text, p_localizacao_destino text DEFAULT NULL::text, p_reversao_de uuid DEFAULT NULL::uuid)
 RETURNS estoque
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_item public.estoque; v_original public.estoque_movimentacoes; v_atual numeric; v_reservado numeric; v_saldo_anterior numeric; v_reservado_anterior numeric;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501'; end if;
  if p_quantidade<0 or (p_quantidade=0 and p_tipo not in ('Ajuste','Inventário')) then raise exception 'Quantidade inválida.'; end if;
  select * into v_item from public.estoque where id=p_estoque_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Item de estoque não encontrado.'; end if;
  v_atual:=v_item.estoque_atual; v_reservado:=v_item.estoque_reservado; v_saldo_anterior:=v_atual; v_reservado_anterior:=v_reservado;
  case p_tipo
    when 'Entrada' then v_atual:=v_atual+p_quantidade;
    when 'Saída' then if v_atual-v_reservado<p_quantidade then raise exception 'Saldo disponível insuficiente.'; end if; v_atual:=v_atual-p_quantidade;
    when 'Reserva' then if v_atual-v_reservado<p_quantidade then raise exception 'Saldo disponível insuficiente para reserva.'; end if; v_reservado:=v_reservado+p_quantidade;
    when 'Liberação' then if v_reservado<p_quantidade then raise exception 'Reserva insuficiente.'; end if; v_reservado:=v_reservado-p_quantidade;
    when 'Ajuste' then v_atual:=p_quantidade; if v_atual<v_reservado then raise exception 'Ajuste menor que o saldo reservado.'; end if;
    when 'Inventário' then v_atual:=p_quantidade; if v_atual<v_reservado then raise exception 'Contagem menor que o saldo reservado.'; end if;
    when 'Transferência' then null;
    when 'Reversão' then
      if p_reversao_de is null then raise exception 'Movimentação original obrigatória.'; end if;
      select * into v_original from public.estoque_movimentacoes where id=p_reversao_de and estoque_id=p_estoque_id and empresa_id=p_empresa_id;
      if not found or v_original.tipo='Reversão' then raise exception 'Movimentação original inválida.'; end if;
      if exists(select 1 from public.estoque_movimentacoes where reversao_de=p_reversao_de) then raise exception 'Movimentação já revertida.'; end if;
      case v_original.tipo when 'Entrada' then if v_atual-v_reservado<v_original.quantidade then raise exception 'Saldo insuficiente para reverter entrada.'; end if; v_atual:=v_atual-v_original.quantidade;
        when 'Saída' then v_atual:=v_atual+v_original.quantidade;
        when 'Reserva' then if v_reservado<v_original.quantidade then raise exception 'Reserva insuficiente para reversão.'; end if; v_reservado:=v_reservado-v_original.quantidade;
        when 'Liberação' then if v_atual-v_reservado<v_original.quantidade then raise exception 'Saldo insuficiente para restaurar reserva.'; end if; v_reservado:=v_reservado+v_original.quantidade;
        else raise exception 'Este tipo deve ser corrigido por nova movimentação de ajuste.'; end case;
    else raise exception 'Tipo de movimentação inválido.';
  end case;
  update public.estoque set estoque_atual=v_atual,estoque_reservado=v_reservado,localizacao=coalesce(p_localizacao_destino,localizacao),ultima_movimentacao_em=now(),updated_at=now() where id=v_item.id and empresa_id=p_empresa_id returning * into v_item;
  insert into public.estoque_movimentacoes(empresa_id,estoque_id,produto_id,user_id,tipo,origem,origem_id,quantidade,saldo_anterior,saldo_posterior,reservado_anterior,reservado_posterior,localizacao_origem,localizacao_destino,observacoes,reversao_de)
  values(p_empresa_id,v_item.id,v_item.produto_id,auth.uid(),p_tipo,p_origem,p_origem_id,p_quantidade,v_saldo_anterior,v_item.estoque_atual,v_reservado_anterior,v_item.estoque_reservado,v_item.localizacao,p_localizacao_destino,p_observacoes,p_reversao_de);
  return v_item;
END;
$function$;

CREATE OR REPLACE FUNCTION public.proteger_autoria_revisao_tributaria()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.proteger_campos_autorizacao_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null and (
    new.email is distinct from old.email
    or new.empresa_id is distinct from old.empresa_id
    or new.empresa_id_bloqueada is distinct from old.empresa_id_bloqueada
    or new.role is distinct from old.role
    or new.tipo_usuario is distinct from old.tipo_usuario
    or new.nivel is distinct from old.nivel
    or new.permissoes is distinct from old.permissoes
    or new.master_admin is distinct from old.master_admin
    or new.status is distinct from old.status
    or new.valor_mensal is distinct from old.valor_mensal
  ) then
    raise exception 'Campos de autorização só podem ser alterados pelo fluxo administrativo seguro.'
      using errcode = '42501';
  end if;
  return new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.proteger_conteudo_alerta_tributario()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.id <> old.id
    or new.empresa_id <> old.empresa_id
    or new.chave_alerta <> old.chave_alerta
    or new.codigo_regra <> old.codigo_regra
    or new.classificacao <> old.classificacao
    or new.titulo <> old.titulo
    or new.descricao <> old.descricao
    or new.fundamento_fonte <> old.fundamento_fonte
    or new.data_regra <> old.data_regra
    or new.created_at <> old.created_at
  then
    raise exception using errcode = 'P0001', message = 'conteudo_alerta_tributario_imutavel';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.proteger_historico_configuracao_tributaria()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.id <> old.id
    or new.empresa_id <> old.empresa_id
    or new.regime_base <> old.regime_base
    or new.ibs_cbs_modalidade <> old.ibs_cbs_modalidade
    or new.vigencia_inicio <> old.vigencia_inicio
    or new.observacoes is distinct from old.observacoes
    or new.criado_por <> old.criado_por
    or new.created_at <> old.created_at
    or old.vigencia_fim is not null
    or new.vigencia_fim is null
  then
    raise exception using errcode = 'P0001', message = 'historico_tributario_imutavel';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.receber_item_pedido(p_item_id uuid, p_empresa_id uuid, p_quantidade numeric)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_item public.pedido_compra_itens;v_pedido public.pedidos_compra;v_novo numeric;v_pendentes integer;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade recebida deve ser maior que zero.';end if;
 select * into v_item from public.pedido_compra_itens where id=p_item_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Item não encontrado.';end if;
 select * into v_pedido from public.pedidos_compra where id=v_item.pedido_id and empresa_id=p_empresa_id and status in ('Comprado','Recebido parcialmente') for update;
 if not found then raise exception 'Pedido não está apto para recebimento.';end if;
 if v_item.estoque_id is null then raise exception 'Vincule o item ao estoque antes de receber.';end if;
 v_novo:=v_item.quantidade_recebida+p_quantidade;if v_novo>v_item.quantidade then raise exception 'Recebimento maior que o saldo pendente.';end if;
 perform public.movimentar_estoque(v_item.estoque_id,p_empresa_id,'Entrada',p_quantidade,'Pedido de compra',p_item_id::text||':'||v_novo::text,'Recebimento confirmado do pedido '||v_pedido.numero,null,null);
 update public.pedido_compra_itens set quantidade_recebida=v_novo where id=p_item_id and empresa_id=p_empresa_id;
 select count(*) into v_pendentes from public.pedido_compra_itens where pedido_id=v_pedido.id and empresa_id=p_empresa_id and quantidade_recebida<quantidade;
 update public.pedidos_compra set status=case when v_pendentes=0 then 'Recebido' else 'Recebido parcialmente' end,updated_at=now() where id=v_pedido.id and empresa_id=p_empresa_id;
 insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao) values(v_pedido.id,p_empresa_id,auth.uid(),'Recebimento','Recebimento de '||p_quantidade||' confirmado e enviado ao estoque.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.receber_item_pedido(p_item_id uuid, p_empresa_id uuid, p_quantidade numeric, p_idempotency_key uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_item public.pedido_compra_itens;v_pedido public.pedidos_compra;v_novo numeric;v_pendentes integer;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 or p_idempotency_key is null then raise exception 'Quantidade e chave de idempotência são obrigatórias.';end if;
 select * into v_item from public.pedido_compra_itens where id=p_item_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Item não encontrado.';end if;
 if exists(select 1 from public.pedido_compra_historico where empresa_id=p_empresa_id and idempotency_key=p_idempotency_key) then return;end if;
 select * into v_pedido from public.pedidos_compra where id=v_item.pedido_id and empresa_id=p_empresa_id and status in ('Comprado','Recebido parcialmente') for update;
 if not found or v_item.estoque_id is null then raise exception 'Pedido ou estoque não está apto para recebimento.';end if;
 v_novo:=v_item.quantidade_recebida+p_quantidade;if v_novo>v_item.quantidade then raise exception 'Recebimento maior que o saldo pendente.';end if;
 perform public.movimentar_estoque(v_item.estoque_id,p_empresa_id,'Entrada',p_quantidade,'Pedido de compra',p_item_id::text||':'||v_novo::text,'Recebimento confirmado do pedido '||v_pedido.numero,null,null);
 update public.pedido_compra_itens set quantidade_recebida=v_novo where id=p_item_id and empresa_id=p_empresa_id;
 select count(*) into v_pendentes from public.pedido_compra_itens where pedido_id=v_pedido.id and empresa_id=p_empresa_id and quantidade_recebida<quantidade;
 update public.pedidos_compra set status=case when v_pendentes=0 then 'Recebido' else 'Recebido parcialmente' end,updated_at=now() where id=v_pedido.id and empresa_id=p_empresa_id;
 insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao,idempotency_key) values(v_pedido.id,p_empresa_id,auth.uid(),'Recebimento','Recebimento de '||p_quantidade||' confirmado e enviado ao estoque.',p_idempotency_key);
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_configuracao_tributaria(p_empresa_id uuid, p_regime_base text, p_ibs_cbs_modalidade text, p_vigencia_inicio date, p_vigencia_fim date DEFAULT NULL::date, p_observacoes text DEFAULT NULL::text)
 RETURNS empresa_configuracoes_tributarias
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_anterior public.empresa_configuracoes_tributarias%rowtype;
  v_nova public.empresa_configuracoes_tributarias%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'usuario_nao_autenticado';
  end if;

  if p_vigencia_inicio is null or (p_vigencia_fim is not null and p_vigencia_fim < p_vigencia_inicio) then
    raise exception using errcode = '22007', message = 'vigencia_invalida';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_empresa_id::text, 0));

  select config.*
    into v_anterior
    from public.empresa_configuracoes_tributarias config
   where config.empresa_id = p_empresa_id
     and config.vigencia_inicio < p_vigencia_inicio
     and config.vigencia_fim is null
   order by config.vigencia_inicio desc
   limit 1
   for update;

  if found then
    update public.empresa_configuracoes_tributarias
       set vigencia_fim = p_vigencia_inicio - 1
     where id = v_anterior.id;
  end if;

  insert into public.empresa_configuracoes_tributarias (
    empresa_id, regime_base, ibs_cbs_modalidade, vigencia_inicio,
    vigencia_fim, observacoes, criado_por
  ) values (
    p_empresa_id, p_regime_base, p_ibs_cbs_modalidade, p_vigencia_inicio,
    p_vigencia_fim, nullif(pg_catalog.btrim(p_observacoes), ''), (select auth.uid())
  )
  returning * into v_nova;

  return v_nova;
end;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_decisao_orcamento(p_orcamento_id uuid, p_empresa_id uuid, p_decisao text, p_observacao text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.registrar_evento_operacao_producao(p_empresa_id uuid, p_alocacao_id uuid, p_evento text, p_ocorrido_em timestamp with time zone, p_observacoes text, p_idempotency_key uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.registrar_titulo_financeiro(p_empresa_id uuid, p_tipo text, p_contraparte_nome text, p_origem text, p_origem_id text, p_referencia text, p_descricao text, p_vencimento date, p_valor numeric, p_contraparte_id text DEFAULT NULL::text, p_categoria text DEFAULT NULL::text, p_centro_custo text DEFAULT NULL::text, p_observacoes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.usuario_tem_modulo('financeiro') then raise exception 'Módulo financeiro não contratado ou não permitido.' using errcode='42501'; end if;
  return public.registrar_titulo_financeiro_interno_v1(p_empresa_id,p_tipo,p_contraparte_nome,p_origem,p_origem_id,p_referencia,p_descricao,p_vencimento,p_valor,p_contraparte_id,p_categoria,p_centro_custo,p_observacoes);
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_titulo_financeiro_interno_v1(p_empresa_id uuid, p_tipo text, p_contraparte_nome text, p_origem text, p_origem_id text, p_referencia text, p_descricao text, p_vencimento date, p_valor numeric, p_contraparte_id text DEFAULT NULL::text, p_categoria text DEFAULT NULL::text, p_centro_custo text DEFAULT NULL::text, p_observacoes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501'; end if;
  if p_valor<=0 then raise exception 'O valor deve ser maior que zero.'; end if;
  insert into public.financeiro_titulos(empresa_id,user_id,tipo,contraparte_id,contraparte_nome,origem,origem_id,referencia,descricao,categoria,centro_custo,vencimento,valor_original,observacoes)
  values(p_empresa_id,auth.uid(),p_tipo,p_contraparte_id,p_contraparte_nome,p_origem,p_origem_id,p_referencia,p_descricao,p_categoria,p_centro_custo,p_vencimento,p_valor,p_observacoes)
  on conflict(empresa_id,tipo,origem,origem_id) do nothing returning id into v_id;
  if v_id is null then raise exception 'Já existe um título para esta origem.'; end if;
  insert into public.financeiro_historico(titulo_id,empresa_id,user_id,tipo,descricao,dados)
  values(v_id,p_empresa_id,auth.uid(),case when p_origem='Manual' then 'Criação' else 'Integração' end,'Título financeiro registrado.',jsonb_build_object('origem',p_origem,'origem_id',p_origem_id));
  return v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_verificacao_tributaria(p_empresa_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.reordenar_fila_producao(p_empresa_id uuid, p_recurso_id uuid, p_alocacoes uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_total integer;
  v_distintos integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.empresa_id = p_empresa_id
  ) then
    raise exception 'Empresa não autorizada.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.recursos_producao r
    where r.id = p_recurso_id and r.empresa_id = p_empresa_id
  ) then
    raise exception 'Recurso produtivo não encontrado para a empresa.';
  end if;

  select count(*), count(distinct item)
    into v_total, v_distintos
  from unnest(coalesce(p_alocacoes, '{}'::uuid[])) item;

  if v_total = 0 or v_total <> v_distintos then
    raise exception 'A fila deve conter alocações únicas.';
  end if;

  if v_total <> (
    select count(*) from public.ordem_producao_recursos opr
    where opr.empresa_id = p_empresa_id and opr.recurso_id = p_recurso_id
  ) or exists (
    select 1 from unnest(p_alocacoes) item
    where not exists (
      select 1 from public.ordem_producao_recursos opr
      where opr.id = item and opr.empresa_id = p_empresa_id and opr.recurso_id = p_recurso_id
    )
  ) then
    raise exception 'A fila mudou desde a última leitura. Atualize a página e tente novamente.';
  end if;

  if exists (
    select 1
    from public.ordem_producao_recursos opr
    where opr.empresa_id = p_empresa_id
      and opr.recurso_id = p_recurso_id
      and not exists (
        select 1
        from public.ordens_producao o
        where o.id = opr.ordem_id
          and o.empresa_id = p_empresa_id
      )
  ) then
    raise exception 'A fila contém ordem de produção inválida para a empresa.';
  end if;

  update public.ordem_producao_recursos opr
  set sequencia = ordered.position,
      user_id = auth.uid(),
      updated_at = now()
  from unnest(p_alocacoes) with ordinality ordered(id, position)
  where opr.id = ordered.id
    and opr.empresa_id = p_empresa_id
    and opr.recurso_id = p_recurso_id;

  insert into public.ordem_producao_historico (ordem_id, empresa_id, user_id, tipo, descricao, dados)
  select opr.ordem_id, p_empresa_id, auth.uid(), 'Programação',
         'Posição da OP atualizada manualmente na fila do recurso.',
         jsonb_build_object('recurso_id', p_recurso_id, 'sequencia', opr.sequencia)
  from public.ordem_producao_recursos opr
  join public.ordens_producao o
    on o.id = opr.ordem_id
   and o.empresa_id = p_empresa_id
  where opr.empresa_id = p_empresa_id
    and opr.recurso_id = p_recurso_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reservar_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_novo numeric;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 if p_quantidade<=0 then raise exception 'Quantidade inválida.';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 if not found then raise exception 'Material não encontrado.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id and status in ('Rascunho','Planejada','Programada','Pausada') for update;
 if not found then raise exception 'OP não permite nova reserva.';end if;
 v_novo:=v_material.quantidade_reservada+p_quantidade;
 if v_novo+v_material.quantidade_consumida>v_material.quantidade_prevista then raise exception 'Reserva acima da necessidade prevista.';end if;
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Reserva',p_quantidade,'Produção','reserva:'||v_material.id::text||':'||v_novo::text,'Reserva confirmada para '||v_ordem.numero_op,null,null);
 update public.ordem_producao_materiais set quantidade_reservada=v_novo,necessidade_compra=false,updated_at=now() where id=v_material.id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(v_ordem.id,p_empresa_id,auth.uid(),'Reserva','Material reservado após confirmação.',jsonb_build_object('material_id',v_material.id,'quantidade',p_quantidade));
END;
$function$;

CREATE OR REPLACE FUNCTION public.reverter_consumo_producao(p_material_id uuid, p_empresa_id uuid, p_movimentacao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_material public.ordem_producao_materiais;v_ordem public.ordens_producao;v_mov public.estoque_movimentacoes;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then raise exception 'Acesso negado à empresa.' using errcode='42501';end if;
 select * into v_material from public.ordem_producao_materiais where id=p_material_id and empresa_id=p_empresa_id for update;
 select * into v_mov from public.estoque_movimentacoes where id=p_movimentacao_id and empresa_id=p_empresa_id and estoque_id=v_material.estoque_id and tipo='Saída' and origem='Produção';
 if not found or v_mov.quantidade>v_material.quantidade_consumida then raise exception 'Consumo inválido para reversão.';end if;
 select * into v_ordem from public.ordens_producao where id=v_material.ordem_id and empresa_id=p_empresa_id for update;
 perform public.movimentar_estoque(v_material.estoque_id,p_empresa_id,'Reversão',v_mov.quantidade,'Produção','reversao:'||p_movimentacao_id::text,'Reversão segura do consumo da '||v_ordem.numero_op,null,p_movimentacao_id);
 update public.ordem_producao_materiais set quantidade_consumida=quantidade_consumida-v_mov.quantidade,updated_at=now() where id=v_material.id and empresa_id=p_empresa_id;
 insert into public.ordem_producao_historico(ordem_id,empresa_id,user_id,tipo,descricao,dados) values(v_ordem.id,p_empresa_id,auth.uid(),'Devolução','Consumo revertido sem apagar a movimentação original.',jsonb_build_object('movimentacao_id',p_movimentacao_id,'quantidade',v_mov.quantidade));
END;
$function$;

CREATE OR REPLACE FUNCTION public.revisar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.salvar_cotacao_pedido_compra(p_cotacao_id uuid, p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_cotacao jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_cotacao_id uuid;
  v_fornecedor_id text:=nullif(btrim(p_cotacao->>'fornecedor_id'),'');
  v_acao text;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Usuário divergente da sessão autenticada.' using errcode='42501'; end if;
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode='42501';
  end if;
  perform 1 from public.pedidos_compra where id=p_pedido_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Pedido não encontrado para a empresa atual.'; end if;
  if v_fornecedor_id is null then raise exception 'Fornecedor da cotação é obrigatório.'; end if;
  if coalesce((p_cotacao->>'valor_total')::numeric,-1)<0 or coalesce((p_cotacao->>'prazo_dias')::integer,-1)<0 or coalesce((p_cotacao->>'custo_kg')::numeric,-1)<0 then
    raise exception 'Valores e prazo da cotação devem ser maiores ou iguais a zero.';
  end if;

  if p_cotacao_id is not null then
    select id into v_cotacao_id from public.pedido_compra_cotacoes where id=p_cotacao_id and pedido_id=p_pedido_id and empresa_id=p_empresa_id for update;
    if not found then raise exception 'Cotação não encontrada para este pedido.'; end if;
  else
    select id into v_cotacao_id from public.pedido_compra_cotacoes where pedido_id=p_pedido_id and empresa_id=p_empresa_id and fornecedor_id=v_fornecedor_id order by created_at desc limit 1 for update;
  end if;

  if v_cotacao_id is null then
    insert into public.pedido_compra_cotacoes(pedido_id,empresa_id,fornecedor_id,fornecedor_snapshot,valor_total,prazo_dias,custo_kg,observacoes)
    values(p_pedido_id,p_empresa_id,v_fornecedor_id,coalesce(p_cotacao->'fornecedor_snapshot','{}'::jsonb),(p_cotacao->>'valor_total')::numeric,(p_cotacao->>'prazo_dias')::integer,(p_cotacao->>'custo_kg')::numeric,nullif(p_cotacao->>'observacoes',''))
    returning id into v_cotacao_id;
    v_acao:='criada';
  else
    update public.pedido_compra_cotacoes set fornecedor_id=v_fornecedor_id,fornecedor_snapshot=coalesce(p_cotacao->'fornecedor_snapshot','{}'::jsonb),
      valor_total=(p_cotacao->>'valor_total')::numeric,prazo_dias=(p_cotacao->>'prazo_dias')::integer,custo_kg=(p_cotacao->>'custo_kg')::numeric,observacoes=nullif(p_cotacao->>'observacoes','')
    where id=v_cotacao_id and pedido_id=p_pedido_id and empresa_id=p_empresa_id;
    v_acao:='atualizada';
  end if;
  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(p_pedido_id,p_empresa_id,p_user_id,'Cotação','Cotação do fornecedor '||v_fornecedor_id||' '||v_acao||' em uma única transação.');
  return v_cotacao_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sincronizar_parcelas_pedido_compra(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_parcelas jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_pedido public.pedidos_compra;
  v_quantidade integer;
  v_soma numeric;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Usuário divergente da sessão autenticada.' using errcode='42501'; end if;
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.empresa_id=p_empresa_id) then
    raise exception 'Usuário sem permissão para esta empresa.' using errcode='42501';
  end if;
  select * into v_pedido from public.pedidos_compra where id=p_pedido_id and empresa_id=p_empresa_id for update;
  if not found then raise exception 'Pedido não encontrado para a empresa atual.'; end if;
  if v_pedido.status not in ('Aprovado','Comprado') then raise exception 'Parcelas só podem ser preparadas para pedido aprovado ou comprado.'; end if;
  if jsonb_typeof(p_parcelas) is distinct from 'array' or jsonb_array_length(p_parcelas)=0 then raise exception 'Informe ao menos uma parcela.'; end if;
  if exists(select 1 from public.pedido_compra_parcelas where pedido_id=p_pedido_id and empresa_id=p_empresa_id and status<>'Pendente') then
    raise exception 'Parcelas processadas não podem ser substituídas.';
  end if;
  if exists(
    select 1 from public.pedido_compra_parcelas pc
    join public.financeiro_titulos ft on ft.empresa_id=p_empresa_id and ft.empresa_id=pc.empresa_id and ft.origem='Compra' and ft.origem_id='parcela:'||pc.id::text
    where pc.pedido_id=p_pedido_id and pc.empresa_id=p_empresa_id
  ) then
    raise exception 'Parcelas já vinculadas a títulos financeiros não podem ser substituídas.';
  end if;

  select count(*),coalesce(sum(p.valor),0) into v_quantidade,v_soma
  from jsonb_to_recordset(p_parcelas) as p(numero integer,vencimento date,valor numeric);
  if exists(select 1 from jsonb_to_recordset(p_parcelas) as p(numero integer,vencimento date,valor numeric) where p.numero<=0 or p.vencimento is null or p.valor<0) then
    raise exception 'Há parcelas inválidas.';
  end if;
  if (select count(distinct p.numero) from jsonb_to_recordset(p_parcelas) as p(numero integer))<>v_quantidade
    or (select min(p.numero) from jsonb_to_recordset(p_parcelas) as p(numero integer))<>1
    or (select max(p.numero) from jsonb_to_recordset(p_parcelas) as p(numero integer))<>v_quantidade then
    raise exception 'A numeração das parcelas deve ser única e sequencial a partir de 1.';
  end if;
  if abs(v_soma-v_pedido.valor_total)>0.01 then raise exception 'A soma das parcelas deve corresponder ao valor total do pedido.'; end if;

  delete from public.pedido_compra_parcelas where pedido_id=p_pedido_id and empresa_id=p_empresa_id;
  insert into public.pedido_compra_parcelas(pedido_id,empresa_id,numero,vencimento,valor,status)
  select p_pedido_id,p_empresa_id,p.numero,p.vencimento,p.valor,'Pendente'
  from jsonb_to_recordset(p_parcelas) as p(numero integer,vencimento date,valor numeric);
  insert into public.pedido_compra_historico(pedido_id,empresa_id,user_id,tipo,descricao)
  values(p_pedido_id,p_empresa_id,p_user_id,'Financeiro',v_quantidade||' parcela(s) pendente(s) sincronizada(s) sem criar títulos financeiros.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.usuario_tem_modulo(p_modulo text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_empresa_id uuid;
  v_plano_id uuid;
  v_tipo_cliente text;
  v_permissoes jsonb;
  v_contratado boolean;
begin
  if (select auth.uid()) is null
     or p_modulo is null
     or p_modulo !~ '^[a-z][a-z0-9_]*$' then
    return false;
  end if;

  select u.empresa_id, e.tipo, coalesce(u.permissoes, '{}'::jsonb)
    into v_empresa_id, v_tipo_cliente, v_permissoes
  from public.usuarios u
  join public.empresas e on e.id = u.empresa_id
  where u.id = (select auth.uid())
    and u.status = 'ATIVO'
    and e.status = 'ATIVO';

  if v_empresa_id is null then
    return false;
  end if;

  if v_tipo_cliente = 'PF'
     and p_modulo not in (
       'financas_pessoais',
       'pessoal_visao_geral',
       'pessoal_receitas',
       'pessoal_despesas',
       'pessoal_contas_pagar',
       'pessoal_contas_fixas',
       'pessoal_orcamentos',
       'pessoal_recorrencias',
       'pessoal_relatorios'
     ) then
    return false;
  end if;

  select e.plano_id
    into v_plano_id
  from public.empresas e
  where e.id = v_empresa_id;

  select em.habilitado
    into v_contratado
  from public.empresa_modulos em
  where em.empresa_id = v_empresa_id
    and em.modulo_key = p_modulo;

  if not found then
    v_contratado := exists (
      select 1
      from public.plano_modulos pm
      join public.planos p on p.id = pm.plano_id
      where pm.plano_id = v_plano_id
        and pm.modulo_key = p_modulo
        and p.ativo
    );
  end if;

  return coalesce(v_contratado, false)
    and v_permissoes @> jsonb_build_object(p_modulo, true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.validar_escopo_categoria_financeira()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_owner uuid;
begin
  if new.categoria_id is null then
    return new;
  end if;

  select c.proprietario_id
    into v_owner
    from public.financeiro_categorias c
   where c.id = new.categoria_id
     and c.empresa_id = new.empresa_id
     and c.ativo;

  if not found then
    raise exception 'Categoria financeira inexistente ou inativa.';
  end if;

  if tg_table_name in (
    'despesas',
    'contas_pagar_pessoais',
    'orcamentos_pessoais_mensais'
  ) then
    if v_owner is distinct from new.proprietario_id then
      raise exception 'Categoria pessoal fora do escopo do proprietário.'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'financeiro_recorrencias' then
    if (new.escopo = 'Pessoal' and v_owner is distinct from new.proprietario_id)
       or (new.escopo = 'Empresarial' and v_owner is not null) then
      raise exception 'Categoria fora do escopo da recorrência.'
        using errcode = '42501';
    end if;
  end if;

  return new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validar_escopo_recorrencia_financeira()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_escopo text;
  v_owner uuid;
begin
  if new.recorrencia_id is null then
    return new;
  end if;

  select r.escopo, r.proprietario_id
    into v_escopo, v_owner
    from public.financeiro_recorrencias r
   where r.id = new.recorrencia_id
     and r.empresa_id = new.empresa_id;

  if not found then
    raise exception 'Recorrência financeira inexistente para a empresa.';
  end if;

  if tg_table_name = 'contas_pagar_pessoais' then
    if v_escopo <> 'Pessoal'
       or v_owner is distinct from new.proprietario_id then
      raise exception 'Recorrência pessoal fora do escopo do proprietário.'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'financeiro_titulos' then
    if v_escopo <> 'Empresarial' or v_owner is not null then
      raise exception 'Título empresarial não pode usar recorrência pessoal.'
        using errcode = '42501';
    end if;
  end if;

  return new;
END;
$function$;
-- L. Triggers finais somente nas tabelas novas.
CREATE TRIGGER crm_oportunidades_protect_scope BEFORE UPDATE ON crm_oportunidades FOR EACH ROW EXECUTE FUNCTION crm_protect_opportunity_scope();
CREATE TRIGGER crm_oportunidades_set_updated_at BEFORE UPDATE ON crm_oportunidades FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();
CREATE TRIGGER proteger_conteudo_alerta_tributario BEFORE UPDATE ON empresa_alertas_tributarios FOR EACH ROW EXECUTE FUNCTION proteger_conteudo_alerta_tributario();
CREATE TRIGGER proteger_historico_configuracao_tributaria BEFORE UPDATE ON empresa_configuracoes_tributarias FOR EACH ROW EXECUTE FUNCTION proteger_historico_configuracao_tributaria();
CREATE TRIGGER proteger_autoria_revisao_tributaria BEFORE UPDATE ON empresa_notas_fiscais_tributarias FOR EACH ROW EXECUTE FUNCTION proteger_autoria_revisao_tributaria();
CREATE TRIGGER financeiro_categorias_set_atualizado_em BEFORE UPDATE ON financeiro_categorias FOR EACH ROW EXECUTE FUNCTION financeiro_planejamento_set_atualizado_em();
CREATE TRIGGER financeiro_recorrencias_set_atualizado_em BEFORE UPDATE ON financeiro_recorrencias FOR EACH ROW EXECUTE FUNCTION financeiro_planejamento_set_atualizado_em();
CREATE TRIGGER recorrencia_validar_categoria BEFORE INSERT OR UPDATE ON financeiro_recorrencias FOR EACH ROW EXECUTE FUNCTION validar_escopo_categoria_financeira();
CREATE TRIGGER financeiro_titulos_validar_recorrencia BEFORE INSERT OR UPDATE OF recorrencia_id, empresa_id ON financeiro_titulos FOR EACH ROW EXECUTE FUNCTION validar_escopo_recorrencia_financeira();
CREATE TRIGGER orcamento_pessoal_validar_categoria BEFORE INSERT OR UPDATE ON orcamentos_pessoais_mensais FOR EACH ROW EXECUTE FUNCTION validar_escopo_categoria_financeira();
CREATE TRIGGER orcamentos_pessoais_set_atualizado_em BEFORE UPDATE ON orcamentos_pessoais_mensais FOR EACH ROW EXECUTE FUNCTION financeiro_planejamento_set_atualizado_em();
-- Reconciliacao final nao destrutiva dos objetos preservados.
alter table only public.contas_pagar_pessoais add constraint cpp_recorrencia_competencia_check CHECK (recorrencia_id IS NULL AND competencia IS NULL OR recorrencia_id IS NOT NULL AND competencia IS NOT NULL AND competencia = date_trunc('month'::text, competencia::timestamp with time zone)::date);
alter table only public.contas_pagar_pessoais add constraint cpp_categoria_financeira_fkey FOREIGN KEY (categoria_id, empresa_id) REFERENCES financeiro_categorias(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.contas_pagar_pessoais add constraint cpp_recorrencia_owner_fkey FOREIGN KEY (recorrencia_id, empresa_id, proprietario_id) REFERENCES financeiro_recorrencias(id, empresa_id, proprietario_id) ON UPDATE CASCADE ON DELETE RESTRICT;
alter table only public.despesas add constraint despesas_categoria_financeira_fkey FOREIGN KEY (categoria_id, empresa_id) REFERENCES financeiro_categorias(id, empresa_id) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE UNIQUE INDEX contas_pagar_pessoais_empresa_document_idempotency_key ON public.contas_pagar_pessoais USING btree (empresa_id, document_idempotency_key) WHERE (document_idempotency_key IS NOT NULL);
CREATE INDEX contas_pagar_pessoais_empresa_idx ON public.contas_pagar_pessoais USING btree (empresa_id);
CREATE INDEX contas_pagar_pessoais_entrada_idx ON public.contas_pagar_pessoais USING btree (proprietario_id, empresa_id, entrada_id) WHERE (entrada_id IS NOT NULL);
CREATE INDEX contas_pagar_pessoais_grupo_idx ON public.contas_pagar_pessoais USING btree (proprietario_id, empresa_id, grupo_parcelamento_id, vencimento) WHERE (grupo_parcelamento_id IS NOT NULL);
CREATE UNIQUE INDEX contas_pagar_pessoais_obrigacao_logica_key ON public.contas_pagar_pessoais USING btree (empresa_id, proprietario_id, lower(btrim(COALESCE(fornecedor, ''::text))), lower(btrim(descricao)), valor, COALESCE(vencimento, '0001-01-01'::date));
CREATE INDEX contas_pagar_pessoais_proprietario_status_idx ON public.contas_pagar_pessoais USING btree (proprietario_id, empresa_id, status);
CREATE INDEX contas_pagar_pessoais_proprietario_vencimento_idx ON public.contas_pagar_pessoais USING btree (proprietario_id, empresa_id, vencimento);
CREATE UNIQUE INDEX cpp_recorrencia_competencia_uidx ON public.contas_pagar_pessoais USING btree (empresa_id, proprietario_id, recorrencia_id, competencia) WHERE (recorrencia_id IS NOT NULL);
CREATE INDEX cpp_pag_eventos_conta_idx ON public.contas_pagar_pessoais_pagamento_eventos USING btree (proprietario_id, empresa_id, conta_pagar_pessoal_id, criado_em);
CREATE UNIQUE INDEX cpp_pag_eventos_entrada_unica_idx ON public.contas_pagar_pessoais_pagamento_eventos USING btree (entrada_id) WHERE (tipo = 'Entrada'::text);
CREATE INDEX cpp_pag_eventos_tipo_data_idx ON public.contas_pagar_pessoais_pagamento_eventos USING btree (proprietario_id, empresa_id, tipo, pago_em);
CREATE UNIQUE INDEX despesas_empresa_idempotency_key ON public.despesas USING btree (empresa_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX despesas_integracao_escopo_idx ON public.despesas USING btree (proprietario_id, empresa_id, data_lancamento) WHERE (pagamento_evento_id IS NOT NULL);
CREATE TRIGGER contas_pagar_pessoais_set_atualizado_em BEFORE UPDATE ON contas_pagar_pessoais FOR EACH ROW EXECUTE FUNCTION contas_pagar_pessoais_set_atualizado_em();
CREATE TRIGGER cpp_validar_categoria BEFORE INSERT OR UPDATE OF categoria_id, empresa_id, proprietario_id ON contas_pagar_pessoais FOR EACH ROW EXECUTE FUNCTION validar_escopo_categoria_financeira();
CREATE TRIGGER cpp_validar_recorrencia BEFORE INSERT OR UPDATE OF recorrencia_id, empresa_id, proprietario_id ON contas_pagar_pessoais FOR EACH ROW EXECUTE FUNCTION validar_escopo_recorrencia_financeira();
CREATE TRIGGER despesas_validar_categoria BEFORE INSERT OR UPDATE OF categoria_id, empresa_id, proprietario_id ON despesas FOR EACH ROW EXECUTE FUNCTION validar_escopo_categoria_financeira();
CREATE TRIGGER usuarios_proteger_campos_autorizacao BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION proteger_campos_autorizacao_usuario();

-- M. RLS e policies finais. Policies public/anon foram deliberadamente
-- restringidas a authenticated; predicates de tenant foram preservados.
alter table public.assinaturas enable row level security;
alter table public.catalogo_importacoes enable row level security;
alter table public.catalogo_produtos enable row level security;
alter table public.categorias enable row level security;
alter table public.clientes enable row level security;
alter table public.compras enable row level security;
alter table public.configuracoes enable row level security;
alter table public.contas enable row level security;
alter table public.contas_pagar enable row level security;
alter table public.crm_oportunidade_historico enable row level security;
alter table public.crm_oportunidades enable row level security;
alter table public.empresa_alertas_tributarios enable row level security;
alter table public.empresa_configuracoes_tributarias enable row level security;
alter table public.empresa_nota_fiscal_analises enable row level security;
alter table public.empresa_nota_fiscal_itens enable row level security;
alter table public.empresa_notas_fiscais_tributarias enable row level security;
alter table public.empresa_regras_tributarias enable row level security;
alter table public.empresa_verificacoes_tributarias enable row level security;
alter table public.emprestimos enable row level security;
alter table public.estoque enable row level security;
alter table public.estoque_movimentacoes enable row level security;
alter table public.financeiro_baixas enable row level security;
alter table public.financeiro_categorias enable row level security;
alter table public.financeiro_conciliacoes enable row level security;
alter table public.financeiro_historico enable row level security;
alter table public.financeiro_recorrencias enable row level security;
alter table public.financeiro_titulos enable row level security;
alter table public.fornecedores enable row level security;
alter table public.ia_comercial_historico enable row level security;
alter table public.inventario_itens enable row level security;
alter table public.inventarios enable row level security;
alter table public.lancamentos enable row level security;
alter table public.lancamentos_pessoais enable row level security;
alter table public.orcamento_aprovacoes enable row level security;
alter table public.orcamento_historico enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamentos_pessoais_mensais enable row level security;
alter table public.ordem_producao_apontamentos enable row level security;
alter table public.ordem_producao_custos enable row level security;
alter table public.ordem_producao_historico enable row level security;
alter table public.ordem_producao_materiais enable row level security;
alter table public.ordem_producao_operacao_apontamentos enable row level security;
alter table public.ordem_producao_operacao_resultados enable row level security;
alter table public.ordem_producao_recursos enable row level security;
alter table public.ordens_producao enable row level security;
alter table public.parcelas enable row level security;
alter table public.pedido_compra_cotacoes enable row level security;
alter table public.pedido_compra_followups enable row level security;
alter table public.pedido_compra_historico enable row level security;
alter table public.pedido_compra_itens enable row level security;
alter table public.pedido_compra_parcelas enable row level security;
alter table public.pedidos_compra enable row level security;
alter table public.produtos enable row level security;
alter table public.prospeccao_interacoes enable row level security;
alter table public.prospeccao_prospectos enable row level security;
alter table public.recebimentos enable row level security;
alter table public.recurso_producao_indisponibilidades enable row level security;
alter table public.recursos_producao enable row level security;
alter table public.vendas enable row level security;
create policy catalogo_importacoes_tenant on public.catalogo_importacoes as permissive for all to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = catalogo_importacoes.empresa_id)))))
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = catalogo_importacoes.empresa_id))))));
create policy comercial_modulo_v1 on public.catalogo_importacoes as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo));
create policy catalogo_produtos_tenant on public.catalogo_produtos as permissive for all to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = catalogo_produtos.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = catalogo_produtos.empresa_id)))));
create policy comercial_modulo_v1 on public.catalogo_produtos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo));
create policy "liberar leitura categorias" on public.categorias as permissive for select to authenticated
using (true);
create policy liberar_select_categorias on public.categorias as permissive for select to authenticated
using (true);
create policy clientes_empresa_v1 on public.clientes as permissive for all to authenticated
using ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))))
with check ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
create policy comercial_modulo_v1 on public.clientes as restrictive for all to authenticated
using (( SELECT (usuario_tem_modulo('crm'::text) OR usuario_tem_modulo('vendas'::text) OR usuario_tem_modulo('financeiro'::text) OR usuario_tem_modulo('orcamentos'::text))))
with check (( SELECT (usuario_tem_modulo('crm'::text) OR usuario_tem_modulo('vendas'::text) OR usuario_tem_modulo('financeiro'::text) OR usuario_tem_modulo('orcamentos'::text))));
create policy comercial_modulo_v1 on public.compras as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo));
create policy compras_empresa_v1 on public.compras as permissive for all to authenticated
using ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))))
with check ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
create policy configuracoes_read_authenticated on public.configuracoes as permissive for select to authenticated
using (true);
create policy "Contas do usuario" on public.contas as permissive for all to authenticated
using ((auth.uid() = usuario_id))
with check ((auth.uid() = usuario_id));
create policy comercial_modulo_v1 on public.contas_pagar as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy contas_pagar_delete_empresa_v2 on public.contas_pagar as permissive for delete to authenticated
using ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
create policy contas_pagar_insert_empresa_v2 on public.contas_pagar as permissive for insert to authenticated
with check ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
create policy contas_pagar_select_empresa_v2 on public.contas_pagar as permissive for select to authenticated
using ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
create policy contas_pagar_update_empresa_v2 on public.contas_pagar as permissive for update to authenticated
using ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))))
with check ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
create policy comercial_modulo_v1 on public.crm_oportunidade_historico as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('crm'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('crm'::text) AS usuario_tem_modulo));
create policy crm_historico_insert_tenant on public.crm_oportunidade_historico as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = crm_oportunidade_historico.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM crm_oportunidades o
  WHERE ((o.id = crm_oportunidade_historico.oportunidade_id) AND (o.empresa_id = crm_oportunidade_historico.empresa_id))))));
create policy crm_historico_select_tenant on public.crm_oportunidade_historico as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = crm_oportunidade_historico.empresa_id)))));
create policy comercial_modulo_v1 on public.crm_oportunidades as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('crm'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('crm'::text) AS usuario_tem_modulo));
create policy crm_oportunidades_delete_tenant on public.crm_oportunidades as permissive for delete to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = crm_oportunidades.empresa_id)))));
create policy crm_oportunidades_insert_tenant on public.crm_oportunidades as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = crm_oportunidades.empresa_id))))));
create policy crm_oportunidades_select_tenant on public.crm_oportunidades as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = crm_oportunidades.empresa_id)))));
create policy crm_oportunidades_update_tenant on public.crm_oportunidades as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = crm_oportunidades.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = crm_oportunidades.empresa_id)))));
create policy "alertas tributarios: cadastro por responsavel" on public.empresa_alertas_tributarios as permissive for insert to authenticated
with check (cf_pode_alterar_tributario(empresa_id));
create policy "alertas tributarios: leitura da empresa" on public.empresa_alertas_tributarios as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = empresa_alertas_tributarios.empresa_id)))));
create policy "alertas tributarios: resolucao por responsavel" on public.empresa_alertas_tributarios as permissive for update to authenticated
using (cf_pode_alterar_tributario(empresa_id))
with check (cf_pode_alterar_tributario(empresa_id));
create policy comercial_modulo_v1 on public.empresa_alertas_tributarios as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo));
create policy "config tributaria: encerramento por responsavel" on public.empresa_configuracoes_tributarias as permissive for update to authenticated
using (cf_pode_alterar_tributario(empresa_id))
with check (cf_pode_alterar_tributario(empresa_id));
create policy "config tributaria: insercao por responsavel" on public.empresa_configuracoes_tributarias as permissive for insert to authenticated
with check (((criado_por = ( SELECT auth.uid() AS uid)) AND cf_pode_alterar_tributario(empresa_id)));
create policy "config tributaria: leitura da empresa" on public.empresa_configuracoes_tributarias as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = empresa_configuracoes_tributarias.empresa_id)))));
create policy comercial_modulo_v1 on public.empresa_configuracoes_tributarias as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo));
create policy empresa_nota_fiscal_analises_insert_responsavel on public.empresa_nota_fiscal_analises as permissive for insert to authenticated
with check (((criado_por = ( SELECT auth.uid() AS uid)) AND cf_pode_alterar_tributario(empresa_id)));
create policy empresa_nota_fiscal_analises_select on public.empresa_nota_fiscal_analises as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = empresa_nota_fiscal_analises.empresa_id)))));
create policy empresa_nota_fiscal_itens_insert_responsavel on public.empresa_nota_fiscal_itens as permissive for insert to authenticated
with check (cf_pode_alterar_tributario(empresa_id));
create policy empresa_nota_fiscal_itens_select on public.empresa_nota_fiscal_itens as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = empresa_nota_fiscal_itens.empresa_id)))));
create policy comercial_modulo_v1 on public.empresa_notas_fiscais_tributarias as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo));
create policy empresa_notas_fiscais_delete_responsavel on public.empresa_notas_fiscais_tributarias as permissive for delete to authenticated
using (((integracao_operacional IS NULL) AND (integrado_em IS NULL) AND cf_pode_alterar_tributario(empresa_id)));
create policy empresa_notas_fiscais_insert_responsavel on public.empresa_notas_fiscais_tributarias as permissive for insert to authenticated
with check (((criado_por = ( SELECT auth.uid() AS uid)) AND cf_pode_alterar_tributario(empresa_id)));
create policy empresa_notas_fiscais_select on public.empresa_notas_fiscais_tributarias as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = empresa_notas_fiscais_tributarias.empresa_id)))));
create policy empresa_notas_fiscais_update_responsavel on public.empresa_notas_fiscais_tributarias as permissive for update to authenticated
using (cf_pode_alterar_tributario(empresa_id))
with check (cf_pode_alterar_tributario(empresa_id));
create policy "regras tributarias: cadastro por responsavel" on public.empresa_regras_tributarias as permissive for insert to authenticated
with check (((criado_por = ( SELECT auth.uid() AS uid)) AND cf_pode_alterar_tributario(empresa_id)));
create policy "regras tributarias: leitura da empresa" on public.empresa_regras_tributarias as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = empresa_regras_tributarias.empresa_id)))));
create policy comercial_modulo_v1 on public.empresa_regras_tributarias as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo));
create policy "verificacao tributaria: atualizacao por responsavel" on public.empresa_verificacoes_tributarias as permissive for update to authenticated
using (cf_pode_alterar_tributario(empresa_id))
with check (((verificado_por = ( SELECT auth.uid() AS uid)) AND cf_pode_alterar_tributario(empresa_id)));
create policy "verificacao tributaria: cadastro por responsavel" on public.empresa_verificacoes_tributarias as permissive for insert to authenticated
with check (((verificado_por = ( SELECT auth.uid() AS uid)) AND cf_pode_alterar_tributario(empresa_id)));
create policy "verificacao tributaria: leitura da empresa" on public.empresa_verificacoes_tributarias as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = empresa_verificacoes_tributarias.empresa_id)))));
create policy comercial_modulo_v1 on public.empresa_verificacoes_tributarias as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('tributario'::text) AS usuario_tem_modulo));
create policy comercial_modulo_v1 on public.emprestimos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy emprestimos_empresa_authenticated on public.emprestimos as permissive for all to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = emprestimos.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = emprestimos.empresa_id)))));
create policy comercial_modulo_v1 on public.estoque as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('estoque'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('estoque'::text) AS usuario_tem_modulo));
create policy estoque_empresa on public.estoque as permissive for all to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = estoque.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = estoque.empresa_id)))));
create policy comercial_modulo_v1 on public.estoque_movimentacoes as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('estoque'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('estoque'::text) AS usuario_tem_modulo));
create policy estoque_mov_insert on public.estoque_movimentacoes as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = estoque_movimentacoes.empresa_id))))));
create policy estoque_mov_select on public.estoque_movimentacoes as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = estoque_movimentacoes.empresa_id)))));
create policy comercial_modulo_v1 on public.financeiro_baixas as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy financeiro_baixas_select_empresa on public.financeiro_baixas as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_baixas.empresa_id)))));
create policy categorias_delete_escopo on public.financeiro_categorias as permissive for delete to authenticated
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((proprietario_id = ( SELECT auth.uid() AS uid)) OR (proprietario_id IS NULL)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_categorias.empresa_id))))));
create policy categorias_insert_escopo on public.financeiro_categorias as permissive for insert to authenticated
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((proprietario_id = ( SELECT auth.uid() AS uid)) OR (proprietario_id IS NULL)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_categorias.empresa_id))))));
create policy categorias_select_escopo on public.financeiro_categorias as permissive for select to authenticated
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((proprietario_id = ( SELECT auth.uid() AS uid)) OR (proprietario_id IS NULL)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_categorias.empresa_id))))));
create policy categorias_update_escopo on public.financeiro_categorias as permissive for update to authenticated
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((proprietario_id = ( SELECT auth.uid() AS uid)) OR (proprietario_id IS NULL)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_categorias.empresa_id))))))
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((proprietario_id = ( SELECT auth.uid() AS uid)) OR (proprietario_id IS NULL)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_categorias.empresa_id))))));
create policy comercial_modulo_v1 on public.financeiro_categorias as restrictive for all to authenticated
using (( SELECT
        CASE
            WHEN (financeiro_categorias.proprietario_id IS NULL) THEN usuario_tem_modulo('financeiro'::text)
            ELSE usuario_tem_modulo('financas_pessoais'::text)
        END AS usuario_tem_modulo))
with check (( SELECT
        CASE
            WHEN (financeiro_categorias.proprietario_id IS NULL) THEN usuario_tem_modulo('financeiro'::text)
            ELSE usuario_tem_modulo('financas_pessoais'::text)
        END AS usuario_tem_modulo));
create policy comercial_modulo_v1 on public.financeiro_conciliacoes as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy financeiro_conciliacoes_empresa on public.financeiro_conciliacoes as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_conciliacoes.empresa_id)))));
create policy financeiro_conciliacoes_insert_empresa on public.financeiro_conciliacoes as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_conciliacoes.empresa_id))))));
create policy financeiro_conciliacoes_update_empresa on public.financeiro_conciliacoes as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_conciliacoes.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_conciliacoes.empresa_id)))));
create policy comercial_modulo_v1 on public.financeiro_historico as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy financeiro_historico_select_empresa on public.financeiro_historico as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_historico.empresa_id)))));
create policy comercial_modulo_v1 on public.financeiro_recorrencias as restrictive for all to authenticated
using (( SELECT
        CASE
            WHEN (financeiro_recorrencias.escopo = 'Pessoal'::text) THEN usuario_tem_modulo('financas_pessoais'::text)
            WHEN (financeiro_recorrencias.escopo = 'Empresarial'::text) THEN usuario_tem_modulo('financeiro'::text)
            ELSE false
        END AS "case"))
with check (( SELECT
        CASE
            WHEN (financeiro_recorrencias.escopo = 'Pessoal'::text) THEN usuario_tem_modulo('financas_pessoais'::text)
            WHEN (financeiro_recorrencias.escopo = 'Empresarial'::text) THEN usuario_tem_modulo('financeiro'::text)
            ELSE false
        END AS "case"));
create policy recorrencias_delete_escopo on public.financeiro_recorrencias as permissive for delete to authenticated
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_recorrencias.empresa_id)))) AND (((escopo = 'Pessoal'::text) AND (proprietario_id = ( SELECT auth.uid() AS uid))) OR (escopo = 'Empresarial'::text))));
create policy recorrencias_insert_escopo on public.financeiro_recorrencias as permissive for insert to authenticated
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (((escopo = 'Pessoal'::text) AND (proprietario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_recorrencias.empresa_id))))) OR ((escopo = 'Empresarial'::text) AND (proprietario_id IS NULL) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_recorrencias.empresa_id))))))));
create policy recorrencias_select_escopo on public.financeiro_recorrencias as permissive for select to authenticated
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_recorrencias.empresa_id)))) AND (((escopo = 'Pessoal'::text) AND (proprietario_id = ( SELECT auth.uid() AS uid))) OR (escopo = 'Empresarial'::text))));
create policy recorrencias_update_escopo on public.financeiro_recorrencias as permissive for update to authenticated
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_recorrencias.empresa_id)))) AND (((escopo = 'Pessoal'::text) AND (proprietario_id = ( SELECT auth.uid() AS uid))) OR (escopo = 'Empresarial'::text))))
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (((escopo = 'Pessoal'::text) AND (proprietario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_recorrencias.empresa_id))))) OR ((escopo = 'Empresarial'::text) AND (proprietario_id IS NULL) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = financeiro_recorrencias.empresa_id))))))));
create policy comercial_modulo_v1 on public.financeiro_titulos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy financeiro_titulos_insert_empresa on public.financeiro_titulos as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_titulos.empresa_id))))));
create policy financeiro_titulos_select_empresa on public.financeiro_titulos as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_titulos.empresa_id)))));
create policy financeiro_titulos_update_empresa on public.financeiro_titulos as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_titulos.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = financeiro_titulos.empresa_id)))));
create policy comercial_modulo_v1 on public.fornecedores as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo));
create policy fornecedores_empresa_v1 on public.fornecedores as permissive for all to authenticated
using ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))))
with check (((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))) AND (user_id IN ( SELECT u.id
   FROM usuarios u
  WHERE (u.empresa_id = fornecedores.empresa_id)))));
create policy comercial_modulo_v1 on public.ia_comercial_historico as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo));
create policy ia_comercial_historico_tenant on public.ia_comercial_historico as permissive for all to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = ia_comercial_historico.empresa_id))))))
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = ia_comercial_historico.empresa_id))))));
create policy comercial_modulo_v1 on public.inventario_itens as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('estoque'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('estoque'::text) AS usuario_tem_modulo));
create policy inventario_itens_empresa on public.inventario_itens as permissive for all to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = inventario_itens.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM inventarios i
  WHERE ((i.id = inventario_itens.inventario_id) AND (i.empresa_id = inventario_itens.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = inventario_itens.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM inventarios i
  WHERE ((i.id = inventario_itens.inventario_id) AND (i.empresa_id = inventario_itens.empresa_id))))));
create policy comercial_modulo_v1 on public.inventarios as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('estoque'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('estoque'::text) AS usuario_tem_modulo));
create policy inventarios_insert_empresa on public.inventarios as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = inventarios.empresa_id))))));
create policy inventarios_select_empresa on public.inventarios as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = inventarios.empresa_id)))));
create policy inventarios_update_empresa on public.inventarios as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = inventarios.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = inventarios.empresa_id)))));
create policy comercial_modulo_v1 on public.lancamentos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy lancamentos_empresa_v1 on public.lancamentos as permissive for all to authenticated
using ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))))
with check ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
create policy "Atualizar meus lancamentos pessoais" on public.lancamentos_pessoais as permissive for update to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));
create policy "Excluir meus lancamentos pessoais" on public.lancamentos_pessoais as permissive for delete to authenticated
using ((user_id = auth.uid()));
create policy "Inserir meus lancamentos pessoais" on public.lancamentos_pessoais as permissive for insert to authenticated
with check ((user_id = auth.uid()));
create policy "Ver meus lancamentos pessoais" on public.lancamentos_pessoais as permissive for select to authenticated
using ((user_id = auth.uid()));
create policy orcamento_aprovacoes_insert_empresa on public.orcamento_aprovacoes as permissive for insert to authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = orcamento_aprovacoes.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM orcamentos o
  WHERE ((o.id = orcamento_aprovacoes.orcamento_id) AND (o.empresa_id = orcamento_aprovacoes.empresa_id))))));
create policy orcamento_aprovacoes_select_empresa on public.orcamento_aprovacoes as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = orcamento_aprovacoes.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM orcamentos o
  WHERE ((o.id = orcamento_aprovacoes.orcamento_id) AND (o.empresa_id = orcamento_aprovacoes.empresa_id))))));
create policy comercial_modulo_v1 on public.orcamento_historico as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('orcamentos'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('orcamentos'::text) AS usuario_tem_modulo));
create policy orcamento_historico_insert_empresa on public.orcamento_historico as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = orcamento_historico.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM orcamentos o
  WHERE ((o.id = orcamento_historico.orcamento_id) AND (o.empresa_id = orcamento_historico.empresa_id))))));
create policy orcamento_historico_select_empresa on public.orcamento_historico as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = orcamento_historico.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM orcamentos o
  WHERE ((o.id = orcamento_historico.orcamento_id) AND (o.empresa_id = orcamento_historico.empresa_id))))));
create policy comercial_modulo_v1 on public.orcamento_itens as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('orcamentos'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('orcamentos'::text) AS usuario_tem_modulo));
create policy orcamento_itens_empresa on public.orcamento_itens as permissive for all to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = orcamento_itens.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM orcamentos o
  WHERE ((o.id = orcamento_itens.orcamento_id) AND (o.empresa_id = orcamento_itens.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = orcamento_itens.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM orcamentos o
  WHERE ((o.id = orcamento_itens.orcamento_id) AND (o.empresa_id = orcamento_itens.empresa_id))))));
create policy comercial_modulo_v1 on public.orcamentos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('orcamentos'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('orcamentos'::text) AS usuario_tem_modulo));
create policy orcamentos_insert_empresa on public.orcamentos as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = orcamentos.empresa_id))))));
create policy orcamentos_select_empresa on public.orcamentos as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = orcamentos.empresa_id)))));
create policy orcamentos_update_empresa on public.orcamentos as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = orcamentos.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = orcamentos.empresa_id)))));
create policy comercial_modulo_v1 on public.orcamentos_pessoais_mensais as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financas_pessoais'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financas_pessoais'::text) AS usuario_tem_modulo));
create policy orcamentos_pessoais_delete_owner on public.orcamentos_pessoais_mensais as permissive for delete to authenticated
using (((proprietario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = orcamentos_pessoais_mensais.empresa_id))))));
create policy orcamentos_pessoais_insert_owner on public.orcamentos_pessoais_mensais as permissive for insert to authenticated
with check (((proprietario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = orcamentos_pessoais_mensais.empresa_id))))));
create policy orcamentos_pessoais_select_owner on public.orcamentos_pessoais_mensais as permissive for select to authenticated
using (((proprietario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = orcamentos_pessoais_mensais.empresa_id))))));
create policy orcamentos_pessoais_update_owner on public.orcamentos_pessoais_mensais as permissive for update to authenticated
using (((proprietario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = orcamentos_pessoais_mensais.empresa_id))))))
with check (((proprietario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = orcamentos_pessoais_mensais.empresa_id))))));
create policy comercial_modulo_v1 on public.ordem_producao_apontamentos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo));
create policy ordem_apontamentos_insert on public.ordem_producao_apontamentos as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_apontamentos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_apontamentos.ordem_id) AND (o.empresa_id = ordem_producao_apontamentos.empresa_id))))));
create policy ordem_apontamentos_select on public.ordem_producao_apontamentos as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_apontamentos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_apontamentos.ordem_id) AND (o.empresa_id = ordem_producao_apontamentos.empresa_id))))));
create policy comercial_modulo_v1 on public.ordem_producao_custos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo));
create policy ordem_producao_custos_insert_empresa on public.ordem_producao_custos as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_custos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_custos.ordem_id) AND (o.empresa_id = ordem_producao_custos.empresa_id))))));
create policy ordem_producao_custos_select_empresa on public.ordem_producao_custos as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_custos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_custos.ordem_id) AND (o.empresa_id = ordem_producao_custos.empresa_id))))));
create policy ordem_producao_custos_update_empresa on public.ordem_producao_custos as permissive for update to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_custos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_custos.ordem_id) AND (o.empresa_id = ordem_producao_custos.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_custos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_custos.ordem_id) AND (o.empresa_id = ordem_producao_custos.empresa_id))))));
create policy comercial_modulo_v1 on public.ordem_producao_historico as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo));
create policy ordem_historico_insert on public.ordem_producao_historico as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_historico.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_historico.ordem_id) AND (o.empresa_id = ordem_producao_historico.empresa_id))))));
create policy ordem_historico_select on public.ordem_producao_historico as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_historico.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_historico.ordem_id) AND (o.empresa_id = ordem_producao_historico.empresa_id))))));
create policy comercial_modulo_v1 on public.ordem_producao_materiais as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo));
create policy ordem_materiais_empresa on public.ordem_producao_materiais as permissive for all to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_materiais.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_materiais.ordem_id) AND (o.empresa_id = ordem_producao_materiais.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_materiais.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_materiais.ordem_id) AND (o.empresa_id = ordem_producao_materiais.empresa_id))))));
create policy operacao_apontamentos_insert_empresa on public.ordem_producao_operacao_apontamentos as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (ordem_producao_recursos opr
     JOIN usuarios u ON (((u.id = auth.uid()) AND (u.empresa_id = opr.empresa_id))))
  WHERE ((opr.id = ordem_producao_operacao_apontamentos.alocacao_id) AND (opr.ordem_id = ordem_producao_operacao_apontamentos.ordem_id) AND (opr.recurso_id = ordem_producao_operacao_apontamentos.recurso_id) AND (opr.empresa_id = ordem_producao_operacao_apontamentos.empresa_id))))));
create policy operacao_apontamentos_select_empresa on public.ordem_producao_operacao_apontamentos as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM (ordem_producao_recursos opr
     JOIN usuarios u ON (((u.id = auth.uid()) AND (u.empresa_id = opr.empresa_id))))
  WHERE ((opr.id = ordem_producao_operacao_apontamentos.alocacao_id) AND (opr.ordem_id = ordem_producao_operacao_apontamentos.ordem_id) AND (opr.recurso_id = ordem_producao_operacao_apontamentos.recurso_id) AND (opr.empresa_id = ordem_producao_operacao_apontamentos.empresa_id)))));
create policy operacao_resultados_insert_empresa on public.ordem_producao_operacao_resultados as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (ordem_producao_recursos opr
     JOIN usuarios u ON (((u.id = auth.uid()) AND (u.empresa_id = opr.empresa_id))))
  WHERE ((opr.id = ordem_producao_operacao_resultados.alocacao_id) AND (opr.ordem_id = ordem_producao_operacao_resultados.ordem_id) AND (opr.recurso_id = ordem_producao_operacao_resultados.recurso_id) AND (opr.empresa_id = ordem_producao_operacao_resultados.empresa_id))))));
create policy operacao_resultados_select_empresa on public.ordem_producao_operacao_resultados as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM (ordem_producao_recursos opr
     JOIN usuarios u ON (((u.id = auth.uid()) AND (u.empresa_id = opr.empresa_id))))
  WHERE ((opr.id = ordem_producao_operacao_resultados.alocacao_id) AND (opr.ordem_id = ordem_producao_operacao_resultados.ordem_id) AND (opr.recurso_id = ordem_producao_operacao_resultados.recurso_id) AND (opr.empresa_id = ordem_producao_operacao_resultados.empresa_id)))));
create policy comercial_modulo_v1 on public.ordem_producao_recursos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo));
create policy ordem_recursos_empresa on public.ordem_producao_recursos as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_recursos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_recursos.ordem_id) AND (o.empresa_id = ordem_producao_recursos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM recursos_producao r
  WHERE ((r.id = ordem_producao_recursos.recurso_id) AND (r.empresa_id = ordem_producao_recursos.empresa_id))))));
create policy ordem_recursos_insert_empresa on public.ordem_producao_recursos as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_recursos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_recursos.ordem_id) AND (o.empresa_id = ordem_producao_recursos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM recursos_producao r
  WHERE ((r.id = ordem_producao_recursos.recurso_id) AND (r.empresa_id = ordem_producao_recursos.empresa_id))))));
create policy ordem_recursos_update_empresa on public.ordem_producao_recursos as permissive for update to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_recursos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_recursos.ordem_id) AND (o.empresa_id = ordem_producao_recursos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM recursos_producao r
  WHERE ((r.id = ordem_producao_recursos.recurso_id) AND (r.empresa_id = ordem_producao_recursos.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordem_producao_recursos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM ordens_producao o
  WHERE ((o.id = ordem_producao_recursos.ordem_id) AND (o.empresa_id = ordem_producao_recursos.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM recursos_producao r
  WHERE ((r.id = ordem_producao_recursos.recurso_id) AND (r.empresa_id = ordem_producao_recursos.empresa_id))))));
create policy comercial_modulo_v1 on public.ordens_producao as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo));
create policy ordens_producao_insert_empresa on public.ordens_producao as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordens_producao.empresa_id))))));
create policy ordens_producao_select_empresa on public.ordens_producao as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordens_producao.empresa_id)))));
create policy ordens_producao_update_empresa on public.ordens_producao as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordens_producao.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = ordens_producao.empresa_id)))));
create policy comercial_modulo_v1 on public.parcelas as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy parcelas_empresa_authenticated on public.parcelas as permissive for all to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = parcelas.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = parcelas.empresa_id)))));
create policy pedido_cotacoes_empresa on public.pedido_compra_cotacoes as permissive for all to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_cotacoes.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_cotacoes.pedido_id) AND (p.empresa_id = pedido_compra_cotacoes.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_cotacoes.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_cotacoes.pedido_id) AND (p.empresa_id = pedido_compra_cotacoes.empresa_id))))));
create policy comercial_modulo_v1 on public.pedido_compra_followups as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo));
create policy pedido_followups_insert_empresa on public.pedido_compra_followups as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_followups.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_followups.pedido_id) AND (p.empresa_id = pedido_compra_followups.empresa_id))))));
create policy pedido_followups_select_empresa on public.pedido_compra_followups as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_followups.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_followups.pedido_id) AND (p.empresa_id = pedido_compra_followups.empresa_id))))));
create policy comercial_modulo_v1 on public.pedido_compra_historico as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo));
create policy pedido_historico_insert on public.pedido_compra_historico as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_historico.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_historico.pedido_id) AND (p.empresa_id = pedido_compra_historico.empresa_id))))));
create policy pedido_historico_select on public.pedido_compra_historico as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_historico.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_historico.pedido_id) AND (p.empresa_id = pedido_compra_historico.empresa_id))))));
create policy pedido_itens_empresa on public.pedido_compra_itens as permissive for all to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_itens.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_itens.pedido_id) AND (p.empresa_id = pedido_compra_itens.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_itens.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_itens.pedido_id) AND (p.empresa_id = pedido_compra_itens.empresa_id))))));
create policy comercial_modulo_v1 on public.pedido_compra_parcelas as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo));
create policy pedido_parcelas_empresa on public.pedido_compra_parcelas as permissive for all to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_parcelas.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_parcelas.pedido_id) AND (p.empresa_id = pedido_compra_parcelas.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedido_compra_parcelas.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM pedidos_compra p
  WHERE ((p.id = pedido_compra_parcelas.pedido_id) AND (p.empresa_id = pedido_compra_parcelas.empresa_id))))));
create policy comercial_modulo_v1 on public.pedidos_compra as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('compras'::text) AS usuario_tem_modulo));
create policy pedidos_compra_empresa on public.pedidos_compra as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedidos_compra.empresa_id)))));
create policy pedidos_compra_insert_empresa on public.pedidos_compra as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedidos_compra.empresa_id))))));
create policy pedidos_compra_update_empresa on public.pedidos_compra as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedidos_compra.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = pedidos_compra.empresa_id)))));
create policy comercial_modulo_v1 on public.produtos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('catalogo'::text) AS usuario_tem_modulo));
create policy produtos_empresa on public.produtos as permissive for all to authenticated
using ((empresa_id = ( SELECT usuarios.empresa_id
   FROM usuarios
  WHERE (usuarios.id = auth.uid()))))
with check ((empresa_id = ( SELECT usuarios.empresa_id
   FROM usuarios
  WHERE (usuarios.id = auth.uid()))));
create policy comercial_modulo_v1 on public.prospeccao_interacoes as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('prospeccao'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('prospeccao'::text) AS usuario_tem_modulo));
create policy prospeccao_interacoes_insert_tenant on public.prospeccao_interacoes as permissive for insert to authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = prospeccao_interacoes.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM prospeccao_prospectos p
  WHERE ((p.id = prospeccao_interacoes.prospecto_id) AND (p.empresa_id = prospeccao_interacoes.empresa_id))))));
create policy prospeccao_interacoes_select_tenant on public.prospeccao_interacoes as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = prospeccao_interacoes.empresa_id)))));
create policy comercial_modulo_v1 on public.prospeccao_prospectos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('prospeccao'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('prospeccao'::text) AS usuario_tem_modulo));
create policy prospeccao_prospectos_delete_tenant on public.prospeccao_prospectos as permissive for delete to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = prospeccao_prospectos.empresa_id)))));
create policy prospeccao_prospectos_insert_tenant on public.prospeccao_prospectos as permissive for insert to authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = prospeccao_prospectos.empresa_id))))));
create policy prospeccao_prospectos_select_tenant on public.prospeccao_prospectos as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = prospeccao_prospectos.empresa_id)))));
create policy prospeccao_prospectos_update_tenant on public.prospeccao_prospectos as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.empresa_id = prospeccao_prospectos.empresa_id)))))
with check ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
create policy comercial_modulo_v1 on public.recebimentos as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('financeiro'::text) AS usuario_tem_modulo));
create policy recebimentos_empresa_authenticated on public.recebimentos as permissive for all to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recebimentos.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recebimentos.empresa_id)))));
create policy comercial_modulo_v1 on public.recurso_producao_indisponibilidades as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo));
create policy recurso_indisponibilidades_empresa on public.recurso_producao_indisponibilidades as permissive for select to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recurso_producao_indisponibilidades.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM recursos_producao r
  WHERE ((r.id = recurso_producao_indisponibilidades.recurso_id) AND (r.empresa_id = recurso_producao_indisponibilidades.empresa_id))))));
create policy recurso_indisponibilidades_insert_empresa on public.recurso_producao_indisponibilidades as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recurso_producao_indisponibilidades.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM recursos_producao r
  WHERE ((r.id = recurso_producao_indisponibilidades.recurso_id) AND (r.empresa_id = recurso_producao_indisponibilidades.empresa_id))))));
create policy recurso_indisponibilidades_update_empresa on public.recurso_producao_indisponibilidades as permissive for update to authenticated
using (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recurso_producao_indisponibilidades.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM recursos_producao r
  WHERE ((r.id = recurso_producao_indisponibilidades.recurso_id) AND (r.empresa_id = recurso_producao_indisponibilidades.empresa_id))))))
with check (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recurso_producao_indisponibilidades.empresa_id)))) AND (EXISTS ( SELECT 1
   FROM recursos_producao r
  WHERE ((r.id = recurso_producao_indisponibilidades.recurso_id) AND (r.empresa_id = recurso_producao_indisponibilidades.empresa_id))))));
create policy comercial_modulo_v1 on public.recursos_producao as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('pcp'::text) AS usuario_tem_modulo));
create policy recursos_producao_empresa on public.recursos_producao as permissive for select to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recursos_producao.empresa_id)))));
create policy recursos_producao_insert_empresa on public.recursos_producao as permissive for insert to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recursos_producao.empresa_id))))));
create policy recursos_producao_update_empresa on public.recursos_producao as permissive for update to authenticated
using ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recursos_producao.empresa_id)))))
with check ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.empresa_id = recursos_producao.empresa_id)))));
create policy comercial_modulo_v1 on public.vendas as restrictive for all to authenticated
using (( SELECT usuario_tem_modulo('vendas'::text) AS usuario_tem_modulo))
with check (( SELECT usuario_tem_modulo('vendas'::text) AS usuario_tem_modulo));
create policy vendas_empresa_v1 on public.vendas as permissive for all to authenticated
using ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))))
with check ((empresa_id = ( SELECT u.empresa_id
   FROM usuarios u
  WHERE (u.id = ( SELECT auth.uid() AS uid)))));
-- M. Grants finais de tabelas/views; anon permanece sem privilegios.
revoke all on table public.assinaturas from anon, authenticated;
revoke all on table public.catalogo_importacoes from anon, authenticated;
revoke all on table public.catalogo_produtos from anon, authenticated;
revoke all on table public.categorias from anon, authenticated;
revoke all on table public.clientes from anon, authenticated;
revoke all on table public.compras from anon, authenticated;
revoke all on table public.configuracoes from anon, authenticated;
revoke all on table public.contas from anon, authenticated;
revoke all on table public.contas_pagar from anon, authenticated;
revoke all on table public.crm_oportunidade_historico from anon, authenticated;
revoke all on table public.crm_oportunidades from anon, authenticated;
revoke all on table public.empresa_alertas_tributarios from anon, authenticated;
revoke all on table public.empresa_configuracoes_tributarias from anon, authenticated;
revoke all on table public.empresa_nota_fiscal_analises from anon, authenticated;
revoke all on table public.empresa_nota_fiscal_itens from anon, authenticated;
revoke all on table public.empresa_notas_fiscais_tributarias from anon, authenticated;
revoke all on table public.empresa_regras_tributarias from anon, authenticated;
revoke all on table public.empresa_verificacoes_tributarias from anon, authenticated;
revoke all on table public.emprestimos from anon, authenticated;
revoke all on table public.estoque from anon, authenticated;
revoke all on table public.estoque_movimentacoes from anon, authenticated;
revoke all on table public.financeiro_baixas from anon, authenticated;
revoke all on table public.financeiro_categorias from anon, authenticated;
revoke all on table public.financeiro_conciliacoes from anon, authenticated;
revoke all on table public.financeiro_historico from anon, authenticated;
revoke all on table public.financeiro_recorrencias from anon, authenticated;
revoke all on table public.financeiro_titulos from anon, authenticated;
revoke all on table public.fornecedores from anon, authenticated;
revoke all on table public.ia_comercial_historico from anon, authenticated;
revoke all on table public.inventario_itens from anon, authenticated;
revoke all on table public.inventarios from anon, authenticated;
revoke all on table public.lancamentos from anon, authenticated;
revoke all on table public.lancamentos_pessoais from anon, authenticated;
revoke all on table public.orcamento_aprovacoes from anon, authenticated;
revoke all on table public.orcamento_historico from anon, authenticated;
revoke all on table public.orcamento_itens from anon, authenticated;
revoke all on table public.orcamentos from anon, authenticated;
revoke all on table public.orcamentos_pessoais_mensais from anon, authenticated;
revoke all on table public.ordem_producao_apontamentos from anon, authenticated;
revoke all on table public.ordem_producao_custos from anon, authenticated;
revoke all on table public.ordem_producao_historico from anon, authenticated;
revoke all on table public.ordem_producao_materiais from anon, authenticated;
revoke all on table public.ordem_producao_operacao_apontamentos from anon, authenticated;
revoke all on table public.ordem_producao_operacao_resultados from anon, authenticated;
revoke all on table public.ordem_producao_recursos from anon, authenticated;
revoke all on table public.ordens_producao from anon, authenticated;
revoke all on table public.parcelas from anon, authenticated;
revoke all on table public.pedido_compra_cotacoes from anon, authenticated;
revoke all on table public.pedido_compra_followups from anon, authenticated;
revoke all on table public.pedido_compra_historico from anon, authenticated;
revoke all on table public.pedido_compra_itens from anon, authenticated;
revoke all on table public.pedido_compra_parcelas from anon, authenticated;
revoke all on table public.pedidos_compra from anon, authenticated;
revoke all on table public.produtos from anon, authenticated;
revoke all on table public.prospeccao_interacoes from anon, authenticated;
revoke all on table public.prospeccao_prospectos from anon, authenticated;
revoke all on table public.recebimentos from anon, authenticated;
revoke all on table public.recurso_producao_indisponibilidades from anon, authenticated;
revoke all on table public.recursos_producao from anon, authenticated;
revoke all on table public.relatorio_anual from anon, authenticated;
revoke all on table public.relatorio_mensal from anon, authenticated;
revoke all on table public.vendas from anon, authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.assinaturas to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.assinaturas to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.catalogo_importacoes to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.catalogo_importacoes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.catalogo_produtos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.catalogo_produtos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.categorias to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.categorias to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.clientes to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.clientes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.compras to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.compras to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.configuracoes to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.configuracoes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.contas to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.contas to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.contas_pagar to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.contas_pagar to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.crm_oportunidade_historico to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.crm_oportunidade_historico to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.crm_oportunidades to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.crm_oportunidades to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_alertas_tributarios to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_alertas_tributarios to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_configuracoes_tributarias to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_configuracoes_tributarias to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_nota_fiscal_analises to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_nota_fiscal_analises to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_nota_fiscal_itens to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_nota_fiscal_itens to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_notas_fiscais_tributarias to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_notas_fiscais_tributarias to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_regras_tributarias to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_regras_tributarias to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_verificacoes_tributarias to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_verificacoes_tributarias to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.emprestimos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.emprestimos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.estoque to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.estoque to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.estoque_movimentacoes to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.estoque_movimentacoes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_baixas to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_baixas to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_categorias to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_categorias to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_conciliacoes to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_conciliacoes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_historico to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_historico to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_recorrencias to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_recorrencias to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_titulos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.financeiro_titulos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.fornecedores to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.fornecedores to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ia_comercial_historico to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ia_comercial_historico to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.inventario_itens to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.inventario_itens to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.inventarios to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.inventarios to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.lancamentos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.lancamentos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.lancamentos_pessoais to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.lancamentos_pessoais to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamento_aprovacoes to service_role;
grant INSERT, SELECT on table public.orcamento_aprovacoes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamento_historico to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamento_historico to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamento_itens to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamento_itens to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamentos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamentos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamentos_pessoais_mensais to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.orcamentos_pessoais_mensais to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_apontamentos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_apontamentos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_custos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_custos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_historico to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_historico to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_materiais to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_materiais to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_operacao_apontamentos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_operacao_apontamentos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_operacao_resultados to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_operacao_resultados to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_recursos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordem_producao_recursos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordens_producao to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.ordens_producao to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.parcelas to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.parcelas to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_cotacoes to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_cotacoes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_followups to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_followups to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_historico to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_historico to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_itens to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_itens to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_parcelas to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedido_compra_parcelas to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedidos_compra to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.pedidos_compra to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.produtos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.produtos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.prospeccao_interacoes to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.prospeccao_interacoes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.prospeccao_prospectos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.prospeccao_prospectos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.recebimentos to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.recebimentos to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.recurso_producao_indisponibilidades to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.recurso_producao_indisponibilidades to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.recursos_producao to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.recursos_producao to authenticated;
grant SELECT on table public.relatorio_anual to authenticated, service_role;
grant SELECT on table public.relatorio_mensal to authenticated, service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.vendas to service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.vendas to authenticated;
-- M. Grants finais de funcoes: sem EXECUTE para public/anon.
revoke all on function public.alterar_status_pedido_compra(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_novo_status text) from public, anon, authenticated, service_role;
revoke all on function public.apontar_resultado_operacao_producao(p_empresa_id uuid, p_alocacao_id uuid, p_quantidade_boa numeric, p_quantidade_refugada numeric, p_operador text, p_motivo_refugo text, p_ocorrido_em timestamp with time zone, p_observacoes text, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.atualizar_pedido_compra_completo(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_pedido jsonb, p_itens jsonb) from public, anon, authenticated, service_role;
revoke all on function public.baixar_reserva_estoque(p_estoque_id uuid, p_empresa_id uuid, p_quantidade numeric, p_venda_id text, p_orcamento_id text) from public, anon, authenticated, service_role;
revoke all on function public.baixar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.baixar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.baixar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.cf_pode_alterar_tributario(p_empresa_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.conciliar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.conciliar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.conciliar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.confirmar_recebimento(p_recebimento_id uuid, p_empresa_id uuid, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.confirmar_recebimento_interno_v1(p_recebimento_id uuid, p_empresa_id uuid, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.consumir_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) from public, anon, authenticated, service_role;
revoke all on function public.contas_pagar_pessoais_set_atualizado_em() from public, anon, authenticated, service_role;
revoke all on function public.converter_prospecto_comercial(p_prospecto_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.criar_pedido_compra_completo(p_empresa_id uuid, p_user_id uuid, p_pedido jsonb, p_itens jsonb) from public, anon, authenticated, service_role;
revoke all on function public.crm_protect_opportunity_scope() from public, anon, authenticated, service_role;
revoke all on function public.crm_set_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.editar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_contraparte_nome text, p_referencia text, p_descricao text, p_categoria text, p_centro_custo text, p_vencimento date, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.editar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_contraparte_nome text, p_referencia text, p_descricao text, p_categoria text, p_centro_custo text, p_vencimento date, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.entrar_produto_acabado(p_ordem_id uuid, p_empresa_id uuid, p_estoque_id uuid, p_quantidade numeric) from public, anon, authenticated, service_role;
revoke all on function public.estornar_baixa_financeira(p_baixa_id uuid, p_empresa_id uuid, p_data date, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.estornar_baixa_financeira_interno_v1(p_baixa_id uuid, p_empresa_id uuid, p_data date, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.excluir_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.finalizar_inventario(p_inventario_id uuid, p_empresa_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.financeiro_planejamento_set_atualizado_em() from public, anon, authenticated, service_role;
revoke all on function public.gerar_titulos_recorrentes(p_competencia date, p_recorrencia_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.importar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota jsonb, p_itens jsonb, p_analise jsonb) from public, anon, authenticated, service_role;
revoke all on function public.liberar_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) from public, anon, authenticated, service_role;
revoke all on function public.materializar_despesa_evento_entrada_pessoal(p_evento_id uuid, p_empresa_id uuid, p_proprietario_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.movimentar_estoque(p_estoque_id uuid, p_empresa_id uuid, p_tipo text, p_quantidade numeric, p_origem text, p_origem_id text, p_observacoes text, p_localizacao_destino text, p_reversao_de uuid) from public, anon, authenticated, service_role;
revoke all on function public.proteger_autoria_revisao_tributaria() from public, anon, authenticated, service_role;
revoke all on function public.proteger_campos_autorizacao_usuario() from public, anon, authenticated, service_role;
revoke all on function public.proteger_conteudo_alerta_tributario() from public, anon, authenticated, service_role;
revoke all on function public.proteger_historico_configuracao_tributaria() from public, anon, authenticated, service_role;
revoke all on function public.receber_item_pedido(p_item_id uuid, p_empresa_id uuid, p_quantidade numeric) from public, anon, authenticated, service_role;
revoke all on function public.receber_item_pedido(p_item_id uuid, p_empresa_id uuid, p_quantidade numeric, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.registrar_configuracao_tributaria(p_empresa_id uuid, p_regime_base text, p_ibs_cbs_modalidade text, p_vigencia_inicio date, p_vigencia_fim date, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.registrar_decisao_orcamento(p_orcamento_id uuid, p_empresa_id uuid, p_decisao text, p_observacao text) from public, anon, authenticated, service_role;
revoke all on function public.registrar_evento_operacao_producao(p_empresa_id uuid, p_alocacao_id uuid, p_evento text, p_ocorrido_em timestamp with time zone, p_observacoes text, p_idempotency_key uuid) from public, anon, authenticated, service_role;
revoke all on function public.registrar_titulo_financeiro(p_empresa_id uuid, p_tipo text, p_contraparte_nome text, p_origem text, p_origem_id text, p_referencia text, p_descricao text, p_vencimento date, p_valor numeric, p_contraparte_id text, p_categoria text, p_centro_custo text, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.registrar_titulo_financeiro_interno_v1(p_empresa_id uuid, p_tipo text, p_contraparte_nome text, p_origem text, p_origem_id text, p_referencia text, p_descricao text, p_vencimento date, p_valor numeric, p_contraparte_id text, p_categoria text, p_centro_custo text, p_observacoes text) from public, anon, authenticated, service_role;
revoke all on function public.registrar_verificacao_tributaria(p_empresa_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.reordenar_fila_producao(p_empresa_id uuid, p_recurso_id uuid, p_alocacoes uuid[]) from public, anon, authenticated, service_role;
revoke all on function public.reservar_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) from public, anon, authenticated, service_role;
revoke all on function public.reverter_consumo_producao(p_material_id uuid, p_empresa_id uuid, p_movimentacao_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.revisar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid) from public, anon, authenticated, service_role;
revoke all on function public.salvar_cotacao_pedido_compra(p_cotacao_id uuid, p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_cotacao jsonb) from public, anon, authenticated, service_role;
revoke all on function public.sincronizar_parcelas_pedido_compra(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_parcelas jsonb) from public, anon, authenticated, service_role;
revoke all on function public.usuario_tem_modulo(p_modulo text) from public, anon, authenticated, service_role;
revoke all on function public.validar_escopo_categoria_financeira() from public, anon, authenticated, service_role;
revoke all on function public.validar_escopo_recorrencia_financeira() from public, anon, authenticated, service_role;
grant execute on function public.alterar_status_pedido_compra(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_novo_status text) to authenticated;
grant execute on function public.alterar_status_pedido_compra(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_novo_status text) to service_role;
grant execute on function public.apontar_resultado_operacao_producao(p_empresa_id uuid, p_alocacao_id uuid, p_quantidade_boa numeric, p_quantidade_refugada numeric, p_operador text, p_motivo_refugo text, p_ocorrido_em timestamp with time zone, p_observacoes text, p_idempotency_key uuid) to authenticated;
grant execute on function public.apontar_resultado_operacao_producao(p_empresa_id uuid, p_alocacao_id uuid, p_quantidade_boa numeric, p_quantidade_refugada numeric, p_operador text, p_motivo_refugo text, p_ocorrido_em timestamp with time zone, p_observacoes text, p_idempotency_key uuid) to service_role;
grant execute on function public.atualizar_pedido_compra_completo(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_pedido jsonb, p_itens jsonb) to authenticated;
grant execute on function public.atualizar_pedido_compra_completo(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_pedido jsonb, p_itens jsonb) to service_role;
grant execute on function public.baixar_reserva_estoque(p_estoque_id uuid, p_empresa_id uuid, p_quantidade numeric, p_venda_id text, p_orcamento_id text) to authenticated;
grant execute on function public.baixar_reserva_estoque(p_estoque_id uuid, p_empresa_id uuid, p_quantidade numeric, p_venda_id text, p_orcamento_id text) to service_role;
grant execute on function public.baixar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text) to service_role;
grant execute on function public.baixar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text, p_idempotency_key uuid) to authenticated;
grant execute on function public.baixar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text, p_idempotency_key uuid) to service_role;
grant execute on function public.baixar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text, p_idempotency_key uuid) to service_role;
grant execute on function public.cf_pode_alterar_tributario(p_empresa_id uuid) to authenticated;
grant execute on function public.cf_pode_alterar_tributario(p_empresa_id uuid) to service_role;
grant execute on function public.conciliar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text) to service_role;
grant execute on function public.conciliar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text, p_idempotency_key uuid) to authenticated;
grant execute on function public.conciliar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text, p_idempotency_key uuid) to service_role;
grant execute on function public.conciliar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text, p_idempotency_key uuid) to service_role;
grant execute on function public.confirmar_recebimento(p_recebimento_id uuid, p_empresa_id uuid, p_idempotency_key uuid) to authenticated;
grant execute on function public.confirmar_recebimento(p_recebimento_id uuid, p_empresa_id uuid, p_idempotency_key uuid) to service_role;
grant execute on function public.confirmar_recebimento_interno_v1(p_recebimento_id uuid, p_empresa_id uuid, p_idempotency_key uuid) to service_role;
grant execute on function public.consumir_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) to authenticated;
grant execute on function public.consumir_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) to service_role;
grant execute on function public.contas_pagar_pessoais_set_atualizado_em() to authenticated;
grant execute on function public.contas_pagar_pessoais_set_atualizado_em() to service_role;
grant execute on function public.converter_prospecto_comercial(p_prospecto_id uuid) to authenticated;
grant execute on function public.converter_prospecto_comercial(p_prospecto_id uuid) to service_role;
grant execute on function public.criar_pedido_compra_completo(p_empresa_id uuid, p_user_id uuid, p_pedido jsonb, p_itens jsonb) to authenticated;
grant execute on function public.criar_pedido_compra_completo(p_empresa_id uuid, p_user_id uuid, p_pedido jsonb, p_itens jsonb) to service_role;
grant execute on function public.crm_protect_opportunity_scope() to service_role;
grant execute on function public.crm_set_updated_at() to service_role;
grant execute on function public.editar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_contraparte_nome text, p_referencia text, p_descricao text, p_categoria text, p_centro_custo text, p_vencimento date, p_observacoes text) to authenticated;
grant execute on function public.editar_titulo_financeiro(p_titulo_id uuid, p_empresa_id uuid, p_contraparte_nome text, p_referencia text, p_descricao text, p_categoria text, p_centro_custo text, p_vencimento date, p_observacoes text) to service_role;
grant execute on function public.editar_titulo_financeiro_interno_v1(p_titulo_id uuid, p_empresa_id uuid, p_contraparte_nome text, p_referencia text, p_descricao text, p_categoria text, p_centro_custo text, p_vencimento date, p_observacoes text) to service_role;
grant execute on function public.entrar_produto_acabado(p_ordem_id uuid, p_empresa_id uuid, p_estoque_id uuid, p_quantidade numeric) to authenticated;
grant execute on function public.entrar_produto_acabado(p_ordem_id uuid, p_empresa_id uuid, p_estoque_id uuid, p_quantidade numeric) to service_role;
grant execute on function public.estornar_baixa_financeira(p_baixa_id uuid, p_empresa_id uuid, p_data date, p_observacoes text) to authenticated;
grant execute on function public.estornar_baixa_financeira(p_baixa_id uuid, p_empresa_id uuid, p_data date, p_observacoes text) to service_role;
grant execute on function public.estornar_baixa_financeira_interno_v1(p_baixa_id uuid, p_empresa_id uuid, p_data date, p_observacoes text) to service_role;
grant execute on function public.excluir_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid) to authenticated;
grant execute on function public.excluir_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid) to service_role;
grant execute on function public.finalizar_inventario(p_inventario_id uuid, p_empresa_id uuid) to authenticated;
grant execute on function public.finalizar_inventario(p_inventario_id uuid, p_empresa_id uuid) to service_role;
grant execute on function public.financeiro_planejamento_set_atualizado_em() to service_role;
grant execute on function public.gerar_titulos_recorrentes(p_competencia date, p_recorrencia_id uuid) to authenticated;
grant execute on function public.gerar_titulos_recorrentes(p_competencia date, p_recorrencia_id uuid) to service_role;
grant execute on function public.importar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota jsonb, p_itens jsonb, p_analise jsonb) to authenticated;
grant execute on function public.importar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota jsonb, p_itens jsonb, p_analise jsonb) to service_role;
grant execute on function public.liberar_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) to authenticated;
grant execute on function public.liberar_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) to service_role;
grant execute on function public.materializar_despesa_evento_entrada_pessoal(p_evento_id uuid, p_empresa_id uuid, p_proprietario_id uuid) to authenticated;
grant execute on function public.materializar_despesa_evento_entrada_pessoal(p_evento_id uuid, p_empresa_id uuid, p_proprietario_id uuid) to service_role;
grant execute on function public.movimentar_estoque(p_estoque_id uuid, p_empresa_id uuid, p_tipo text, p_quantidade numeric, p_origem text, p_origem_id text, p_observacoes text, p_localizacao_destino text, p_reversao_de uuid) to authenticated;
grant execute on function public.movimentar_estoque(p_estoque_id uuid, p_empresa_id uuid, p_tipo text, p_quantidade numeric, p_origem text, p_origem_id text, p_observacoes text, p_localizacao_destino text, p_reversao_de uuid) to service_role;
grant execute on function public.proteger_autoria_revisao_tributaria() to authenticated;
grant execute on function public.proteger_autoria_revisao_tributaria() to service_role;
grant execute on function public.proteger_campos_autorizacao_usuario() to service_role;
grant execute on function public.proteger_conteudo_alerta_tributario() to authenticated;
grant execute on function public.proteger_conteudo_alerta_tributario() to service_role;
grant execute on function public.proteger_historico_configuracao_tributaria() to authenticated;
grant execute on function public.proteger_historico_configuracao_tributaria() to service_role;
grant execute on function public.receber_item_pedido(p_item_id uuid, p_empresa_id uuid, p_quantidade numeric) to service_role;
grant execute on function public.receber_item_pedido(p_item_id uuid, p_empresa_id uuid, p_quantidade numeric, p_idempotency_key uuid) to authenticated;
grant execute on function public.receber_item_pedido(p_item_id uuid, p_empresa_id uuid, p_quantidade numeric, p_idempotency_key uuid) to service_role;
grant execute on function public.registrar_configuracao_tributaria(p_empresa_id uuid, p_regime_base text, p_ibs_cbs_modalidade text, p_vigencia_inicio date, p_vigencia_fim date, p_observacoes text) to authenticated;
grant execute on function public.registrar_configuracao_tributaria(p_empresa_id uuid, p_regime_base text, p_ibs_cbs_modalidade text, p_vigencia_inicio date, p_vigencia_fim date, p_observacoes text) to service_role;
grant execute on function public.registrar_decisao_orcamento(p_orcamento_id uuid, p_empresa_id uuid, p_decisao text, p_observacao text) to authenticated;
grant execute on function public.registrar_decisao_orcamento(p_orcamento_id uuid, p_empresa_id uuid, p_decisao text, p_observacao text) to service_role;
grant execute on function public.registrar_evento_operacao_producao(p_empresa_id uuid, p_alocacao_id uuid, p_evento text, p_ocorrido_em timestamp with time zone, p_observacoes text, p_idempotency_key uuid) to authenticated;
grant execute on function public.registrar_evento_operacao_producao(p_empresa_id uuid, p_alocacao_id uuid, p_evento text, p_ocorrido_em timestamp with time zone, p_observacoes text, p_idempotency_key uuid) to service_role;
grant execute on function public.registrar_titulo_financeiro(p_empresa_id uuid, p_tipo text, p_contraparte_nome text, p_origem text, p_origem_id text, p_referencia text, p_descricao text, p_vencimento date, p_valor numeric, p_contraparte_id text, p_categoria text, p_centro_custo text, p_observacoes text) to authenticated;
grant execute on function public.registrar_titulo_financeiro(p_empresa_id uuid, p_tipo text, p_contraparte_nome text, p_origem text, p_origem_id text, p_referencia text, p_descricao text, p_vencimento date, p_valor numeric, p_contraparte_id text, p_categoria text, p_centro_custo text, p_observacoes text) to service_role;
grant execute on function public.registrar_titulo_financeiro_interno_v1(p_empresa_id uuid, p_tipo text, p_contraparte_nome text, p_origem text, p_origem_id text, p_referencia text, p_descricao text, p_vencimento date, p_valor numeric, p_contraparte_id text, p_categoria text, p_centro_custo text, p_observacoes text) to service_role;
grant execute on function public.registrar_verificacao_tributaria(p_empresa_id uuid) to authenticated;
grant execute on function public.registrar_verificacao_tributaria(p_empresa_id uuid) to service_role;
grant execute on function public.reordenar_fila_producao(p_empresa_id uuid, p_recurso_id uuid, p_alocacoes uuid[]) to authenticated;
grant execute on function public.reordenar_fila_producao(p_empresa_id uuid, p_recurso_id uuid, p_alocacoes uuid[]) to service_role;
grant execute on function public.reservar_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) to authenticated;
grant execute on function public.reservar_material_producao(p_material_id uuid, p_empresa_id uuid, p_quantidade numeric) to service_role;
grant execute on function public.reverter_consumo_producao(p_material_id uuid, p_empresa_id uuid, p_movimentacao_id uuid) to authenticated;
grant execute on function public.reverter_consumo_producao(p_material_id uuid, p_empresa_id uuid, p_movimentacao_id uuid) to service_role;
grant execute on function public.revisar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid) to authenticated;
grant execute on function public.revisar_nota_fiscal_tributaria(p_empresa_id uuid, p_nota_fiscal_id uuid) to service_role;
grant execute on function public.salvar_cotacao_pedido_compra(p_cotacao_id uuid, p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_cotacao jsonb) to authenticated;
grant execute on function public.salvar_cotacao_pedido_compra(p_cotacao_id uuid, p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_cotacao jsonb) to service_role;
grant execute on function public.sincronizar_parcelas_pedido_compra(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_parcelas jsonb) to authenticated;
grant execute on function public.sincronizar_parcelas_pedido_compra(p_pedido_id uuid, p_empresa_id uuid, p_user_id uuid, p_parcelas jsonb) to service_role;
grant execute on function public.usuario_tem_modulo(p_modulo text) to authenticated;
grant execute on function public.usuario_tem_modulo(p_modulo text) to service_role;
grant execute on function public.validar_escopo_categoria_financeira() to service_role;
grant execute on function public.validar_escopo_recorrencia_financeira() to service_role;

-- Pos-condicoes estruturais; qualquer divergencia reverte toda a transacao.
do $postflight$
declare
  missing_count integer;
  nonempty_count integer;
begin
  select count(*) into missing_count
  from (values
    ('clientes'),('produtos'),('fornecedores'),('compras'),('vendas'),('lancamentos'),
    ('recebimentos'),('contas_pagar'),('crm_oportunidades'),('orcamentos'),('estoque'),
    ('pedidos_compra'),('financeiro_titulos'),('ordens_producao'),('prospeccao_prospectos'),
    ('catalogo_produtos'),('empresa_configuracoes_tributarias')
  ) v(name)
  where to_regclass('public.' || v.name) is null;
  if missing_count <> 0 then raise exception 'Postflight: objetos essenciais ausentes.'; end if;

  select count(*) into nonempty_count
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in (
    'clientes','produtos','fornecedores','compras','vendas','lancamentos','recebimentos',
    'contas_pagar','crm_oportunidades','orcamentos','estoque','pedidos_compra',
    'financeiro_titulos','ordens_producao','prospeccao_prospectos','catalogo_produtos'
  ) and c.reltuples > 0;
  if nonempty_count <> 0 then raise exception 'Postflight: tabelas novas nao estao vazias.'; end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
      and c.relname not like '\_%' escape '\'
      and c.relname not in ('empresas','usuarios')
      and not c.relrowsecurity
  ) then raise exception 'Postflight: existe tabela public sem RLS.'; end if;
end
$postflight$;

commit;
