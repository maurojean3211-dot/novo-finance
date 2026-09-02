# Manifesto de reconciliação — `cunhacontrol-homolog`

**Etapa:** 0 — documentação para revisão, sem migration executável

**Baseline Git:** `estabilizacao/fase-1-2026-08-30` @ `dd19d6bc00560d77cff1b09ae78448cbe469a2d3`

**Produção (referência estrutural, nunca origem de dados):** `leissgrymkxakjvurric`

**Alvo futuro:** `cunhacontrol-homolog` / `toiehtfotpjwjslpwdff`

**Data do inventário aprovado:** 2026-08-31

> Este arquivo não é SQL executável e não autoriza nenhuma alteração. O catálogo remoto citado foi coletado anteriormente em modo somente leitura. Antes de qualquer etapa futura, as consultas anexas devem reconfirmar o estado.

## 1. Decisão e limites

A homologação deve convergir por um baseline estrutural próprio e aditivo. É proibido reaplicar genericamente as 45 migrations locais, usar `db push`, clonar produção ou substituir os oito objetos já existentes.

Exclusões obrigatórias:

- dados, usuários Auth, empresas, documentos ou segredos reais de produção;
- tabelas técnicas `_cf_*`, em especial `_cf_tenant_batch_karla_ce1` e `_cf_tenant_batch_mauro_a_becf`;
- views `relatorio_anual` e `relatorio_mensal`, pois não há consumidor confirmado no frontend;
- grants residuais/excessivos de produção;
- `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, seeds, backfills e conversões históricas;
- Auth, Edge Functions e Storage;
- a RPC `provisionar_conta_v1`: o frontend a referencia, mas ela não existe em produção nem em homologação. A divergência fica registrada; **não implementar nesta etapa**.

## 2. Baseline mensurável

| Classe | Referência estrutural | Homologação atual | Delta bruto |
|---|---:|---:|---:|
| tabelas públicas | 73 | 8 | 65 |
| colunas | 986 | 105 | 881 |
| PKs | 72 | 8 | 64 |
| FKs | 167 | 20 | 147 |
| índices | 224 | 26 | 198 |
| UNIQUEs | 52 | 14 | 38 |
| CHECKs | 170 | 23 | 147 |
| triggers | 30 | 6 | 24 |
| tabelas com RLS | 71 | 8 | 63 |
| policies | 214 | 21 | 193 |
| funções públicas | 69 | 9 | 60 |
| views | 2 | 0 | 2 (ambas excluídas) |
| migrations registradas | 45 | 5 | históricos independentes |

O delta bruto não é uma lista de criação: dele devem ser retirados os dois objetos `_cf_*`, as duas views legadas e qualquer função/grant sem consumidor ou dependência confirmada. O estado final é definido pelo catálogo funcional abaixo, não por clonagem literal de produção.

## 3. Catálogo final requerido

### 3.1 Catálogo funcional consolidado por domínio

A varredura literal encontrou 58 nomes em chamadas `.from(...)`. A lista consolidada abaixo também inclui relações embutidas e dependências confirmadas de triggers/RPCs; portanto, não deve ser interpretada como contagem exclusiva de chamadas diretas.

| Domínio | Tabelas |
|---|---|
| base e cadastro | `empresas`, `usuarios`, `clientes`, `fornecedores`, `produtos`, `plano_modulos`, `empresa_modulos` |
| comercial/CRM | `crm_oportunidades`, `crm_oportunidade_historico`, `prospeccao_prospectos`, `prospeccao_interacoes`, `orcamentos`, `orcamento_itens`, `orcamento_historico`, `vendas`, `recebimentos`, `parcelas` |
| compras | `compras`, `pedidos_compra`, `pedido_compra_itens`, `pedido_compra_cotacoes`, `pedido_compra_historico`, `pedido_compra_parcelas`, `pedido_compra_followups` |
| estoque/PCP | `estoque`, `estoque_movimentacoes`, `inventarios`, `inventario_itens`, `ordens_producao`, `ordem_producao_apontamentos`, `ordem_producao_historico`, `ordem_producao_materiais`, `ordem_producao_custos`, `recursos_producao`, `ordem_producao_recursos`, `recurso_producao_indisponibilidades`, `ordem_producao_operacao_apontamentos`, `ordem_producao_operacao_resultados` |
| financeiro corporativo | `financeiro_titulos`, `financeiro_baixas`, `financeiro_conciliacoes`, `financeiro_historico`, `financeiro_categorias`, `financeiro_recorrencias`, `contas_pagar` |
| financeiro pessoal | `despesas`, `contas_fixas`, `contas_pagar_pessoais`, `contas_pagar_pessoais_entradas`, `contas_pagar_pessoais_grupo_metadados`, `contas_pagar_pessoais_pagamento_eventos`, `orcamentos_pessoais_mensais` |
| tributário | `empresa_configuracoes_tributarias`, `empresa_regras_tributarias`, `empresa_alertas_tributarios`, `empresa_verificacoes_tributarias`, `empresa_notas_fiscais_tributarias` |
| catálogo/IA | `catalogo_importacoes`, `catalogo_produtos`, `ia_comercial_historico` |
| legado ainda consumido | `lancamentos`, `emprestimos` |

### 3.2 Dependências indiretas críticas

`orcamento_aprovacoes`, `pedido_compra_itens`, `empresa_nota_fiscal_itens`, `empresa_nota_fiscal_analises`, `ordem_producao_operacao_apontamentos` e `ordem_producao_operacao_resultados` devem existir mesmo quando o acesso principal ocorre por relações ou RPCs. Os nomes que já aparecem na lista direta não devem ser contados duas vezes.

### 3.3 Contrato de colunas

O contrato completo de cada coluna é a tupla:

`schema, tabela, posição, nome, tipo SQL/UDT, nulabilidade, default, identity, generated`.

A enumeração exata será produzida pelo bloco **C02** do preflight e comparada pelo bloco **V02** da pós-validação. Para revisão humana, os campos transversais obrigatórios são:

- identidade: `id` com PK para todas as entidades persistentes;
- escopo empresarial: `empresa_id` em toda entidade multiempresa;
- ownership pessoal: `proprietario_id` nas entidades pessoais;
- auditoria temporal: campos `criado_em`/`atualizado_em` ou `created_at`/`updated_at` conforme o contrato já vigente da tabela, sem renomeação cosmética;
- referências de autoria: `usuario_id`, `criado_por`, `revisado_por` ou equivalentes somente onde o fluxo existente os usa;
- chaves de idempotência nos fluxos financeiros/estoque/compras que já as exigem;
- colunas selecionadas/gravadas pelo frontend no HEAD são obrigatórias mesmo quando legadas.

Não se deve “normalizar” nomes durante a reconciliação. Tipos, defaults e nulabilidade devem corresponder ao estado final inventariado; qualquer divergência interrompe a futura geração de migration.

## 4. PKs, FKs, UNIQUEs e CHECKs

Regras obrigatórias do catálogo:

1. toda tabela de entidade mantém sua PK existente; nenhuma PK das oito tabelas pode ser recriada;
2. FKs de tenant apontam para `empresas(id)` e não podem permitir troca de empresa por cascade;
3. ownership pessoal deve manter referência a `auth.users(id)`/perfil vigente e filtros simultâneos por `empresa_id` e `proprietario_id`;
4. tabelas-filhas mantêm FK para o pai e, quando presente no modelo final, também carregam `empresa_id` para isolamento verificável;
5. UNIQUEs de idempotência, competência, número operacional e composição pai/item devem ser preservados;
6. CHECKs de status, tipo, escopo, valores não negativos, datas e consistência de pagamento devem ser copiados por definição semântica, não apenas por nome;
7. a FK adicional de `usuarios` em homologação deve ser preservada até prova de incompatibilidade;
8. novas FKs sobre dados existentes devem ser planejadas como `NOT VALID` e validadas em etapa posterior, nunca nesta etapa.

Os blocos **C03–C05** e **V03–V05** listam definições normalizadas, colunas participantes e referências.

## 5. Índices

Devem existir:

- índices de todas as PKs e UNIQUEs;
- índices nas colunas FK usadas em joins;
- índices compostos iniciados por `empresa_id` para filtros multiempresa frequentes;
- índices compostos por `empresa_id, proprietario_id` nos fluxos pessoais;
- índices de status/data/competência usados pelos relatórios e filas;
- índices de idempotência dos fluxos financeiros e operacionais;
- índices parciais somente quando o predicado corresponde às consultas atuais.

Não duplicar índices semanticamente equivalentes por diferença de nome. A comparação usa `pg_get_indexdef`, via **C06/V06**.

## 6. Triggers

O estado de referência possui 30 triggers; homologação possui 6. O conjunto requerido inclui, conforme a tabela existir:

- atualização temporal: `crm_oportunidades_set_updated_at`, `contas_pagar_pessoais_set_atualizado_em`, `financeiro_categorias_set_atualizado_em`, `financeiro_recorrencias_set_atualizado_em`, `orcamentos_pessoais_set_atualizado_em`;
- proteção de escopo/autorização: `crm_oportunidades_protect_scope`, `despesas_ownership_pessoal`, `usuarios_proteger_campos_autorizacao`, `proteger_campos_comerciais_empresa_trg`;
- integridade financeira pessoal: `cpp_pag_eventos_materializacao_diferida`, `despesas_evento_pessoal_integridade`, `proteger_financeiro_conta_pessoal_paga`, `cpp_validar_categoria`, `cpp_validar_recorrencia`, `despesas_validar_categoria`, `orcamento_pessoal_validar_categoria`, `recorrencia_validar_categoria`, `financeiro_titulos_validar_recorrencia`;
- proteção tributária: `proteger_conteudo_alerta_tributario`, `proteger_historico_configuracao_tributaria`, `proteger_autoria_revisao_tributaria`.

O inventário completo e a função chamada por cada trigger são obtidos por **C07/V07**. Triggers equivalentes não devem ser recriados somente por diferença de nome.

## 7. RLS e policies

Requisitos:

- RLS habilitada em todas as tabelas de negócio expostas no schema `public`;
- `anon` sem policies de negócio por padrão;
- `authenticated` sempre com predicado de tenant e, no pessoal, também de proprietário;
- UPDATE exige policy SELECT correspondente e `USING` + `WITH CHECK`;
- autorização de módulo usa `usuario_tem_modulo(...)` somente depois de `plano_modulos`, `empresa_modulos` e a função existirem;
- não usar `auth.role()`; usar roles no `TO` e autorização por `auth.uid()`/tenant;
- comparar `qual` e `with_check`; nomes diferentes não justificam substituição.

O snapshot aprovado tinha 214 policies em produção e 21 em homologação. Esse número é referência diagnóstica, não meta cega: policies de objetos excluídos não entram. O catálogo final será a allowlist de policies sobre as tabelas das seções 3.1/3.2, inventariada por **C08/V08**.

## 8. RPCs e assinaturas requeridas pelo frontend (30)

| RPC | Assinatura de identidade requerida |
|---|---|
| `alterar_status_pedido_compra` | conforme `pg_get_function_identity_arguments` do catálogo aprovado |
| `apontar_resultado_operacao_producao` | idem |
| `atualizar_metadados_grupo_conta_pessoal` | preservar assinatura existente em homologação |
| `baixar_reserva_estoque` | `(p_estoque_id uuid, p_empresa_id uuid, p_quantidade numeric, p_venda_id text, p_orcamento_id text)` |
| `baixar_titulo_financeiro` | `(p_titulo_id uuid, p_empresa_id uuid, p_valor numeric, p_data date, p_forma text, p_conta text, p_observacoes text, p_idempotency_key uuid)` |
| `conciliar_titulo_financeiro` | `(p_titulo_id uuid, p_empresa_id uuid, p_conta text, p_data date, p_valor numeric, p_status text, p_observacoes text, p_idempotency_key uuid)` |
| `confirmar_recebimento` | `(p_recebimento_id uuid, p_empresa_id uuid, p_idempotency_key uuid)` |
| `converter_prospecto_comercial` | `(p_prospecto_id uuid)` |
| `criar_parcelamento_conta_pessoal` | preservar assinatura existente em homologação |
| `criar_parcelamento_conta_pessoal_com_entrada` | preservar assinatura existente em homologação |
| `editar_titulo_financeiro` | `(p_titulo_id uuid, p_empresa_id uuid, p_contraparte_nome text, p_referencia text, p_descricao text, p_categoria text, p_centro_custo text, p_vencimento date, p_observacoes text)` |
| `estornar_baixa_financeira` | `(p_baixa_id uuid, p_empresa_id uuid, p_data date, p_observacoes text)` |
| `estornar_pagamento_conta_pessoal` | preservar assinatura existente em homologação |
| `excluir_nota_fiscal_tributaria` | `(p_empresa_id uuid, p_nota_fiscal_id uuid)` |
| `finalizar_inventario` | `(p_inventario_id uuid, p_empresa_id uuid)` |
| `gerar_titulos_recorrentes` | conferir assinatura final em **C09**; não usar versão histórica intermediária |
| `importar_nota_fiscal_tributaria` | conferir assinatura final em **C09** |
| `movimentar_estoque` | `(p_estoque_id uuid, p_empresa_id uuid, p_tipo text, p_quantidade numeric, p_origem text, p_origem_id text, p_observacoes text, p_localizacao_destino text, p_reversao_de uuid)` |
| `provisionar_conta_v1` | **AUSENTE NOS DOIS AMBIENTES; divergência registrada; não criar** |
| `receber_item_pedido` | `(p_item_id uuid, p_empresa_id uuid, p_quantidade numeric, p_idempotency_key uuid)` |
| `registrar_configuracao_tributaria` | conferir assinatura final em **C09** |
| `registrar_decisao_orcamento` | conferir assinatura final em **C09** |
| `registrar_evento_operacao_producao` | conferir assinatura final em **C09** |
| `registrar_pagamento_conta_pessoal` | preservar assinatura existente em homologação |
| `registrar_titulo_financeiro` | `(p_empresa_id uuid, p_tipo text, p_contraparte_nome text, p_origem text, p_origem_id text, p_referencia text, p_descricao text, p_vencimento date, p_valor numeric, p_contraparte_id text, p_categoria text, p_centro_custo text, p_observacoes text)` |
| `registrar_verificacao_tributaria` | `(p_empresa_id uuid)` |
| `reordenar_fila_producao` | conferir assinatura final em **C09** |
| `revisar_nota_fiscal_tributaria` | `(p_empresa_id uuid, p_nota_fiscal_id uuid)` |
| `salvar_cotacao_pedido_compra` | conferir assinatura final em **C09** |
| `sincronizar_parcelas_pedido_compra` | conferir assinatura final em **C09** |

As cinco RPCs pessoais já existentes são objetos a preservar. Funções auxiliares necessárias a policies/triggers entram somente se houver dependência comprovada. Toda função futura deve ter `search_path` fixo/revisado; `SECURITY DEFINER` exige justificativa, checagem interna de identidade/tenant e revogação de EXECUTE de `PUBLIC`.

## 9. Grants mínimos por role

| Role | Tabelas | Funções |
|---|---|---|
| `PUBLIC` | nenhum grant explícito de negócio | nenhum EXECUTE de RPC de negócio |
| `anon` | nenhum por padrão | nenhuma das 30 RPCs por padrão |
| `authenticated` | somente SELECT/INSERT/UPDATE/DELETE exigidos pelo fluxo e protegidos por RLS; nunca DDL | EXECUTE apenas na allowlist de RPCs chamada pelo frontend |
| `service_role` | privilégios administrativos necessários nas tabelas homologadas | EXECUTE administrativo necessário |

São proibidos para `anon` e `authenticated`: `TRUNCATE`, `TRIGGER`, `REFERENCES`, criação/alteração de schema e grants herdados de produção. **C10/V10** inventariam grants de tabela e função.

## 10. Ordem de dependência futura

1. extensões já autorizadas e funções auxiliares sem dependência de tabela;
2. `empresas`, `usuarios`, planos e módulos;
3. cadastros (`clientes`, `fornecedores`, `produtos`);
4. comercial/CRM e orçamentos;
5. estoque;
6. compras;
7. PCP;
8. financeiro corporativo;
9. categorias/recorrências e financeiro pessoal;
10. tributário/notas fiscais;
11. catálogo/IA e legado ainda consumido;
12. PKs/UNIQUEs/CHECKs não inline;
13. FKs e sua validação controlada;
14. índices;
15. funções de trigger e triggers;
16. funções auxiliares de autorização;
17. RLS e policies, incluindo enforcement de módulo;
18. RPCs operacionais;
19. revogações e grants mínimos;
20. pós-validação somente leitura.

Dependências críticas: `empresas → usuarios → usuario_tem_modulo → policies comercial_modulo_v1`; tabelas pai antes das filhas; estoque antes das RPCs de recebimento/PCP; categorias/recorrências antes dos triggers financeiros; tabelas tributárias antes das RPCs de importação/revisão.

## 11. Diferenças exatas das oito tabelas existentes

| Tabela | Estado/delta aprovado | Ação futura permitida |
|---|---|---|
| `contas_fixas` | colunas, PK, FK e índices compatíveis; RLS em ambos; falta `comercial_modulo_v1` | preservar estrutura e dados; adicionar somente enforcement após dependências |
| `contas_pagar_pessoais` | faltam `categoria_id`, `recorrencia_id`, `competencia`, `classificacao_financeira`; 2 FKs; índices de categoria, recorrência, competência e idempotência; 3 triggers; policy de módulo | evolução aditiva; colunas inicialmente anuláveis; validar antes de FK/CHECK |
| `contas_pagar_pessoais_entradas` | mesma contagem de colunas, FKs, CHECKs, índices e UNIQUEs; falta policy de módulo | preservar; comparar definições semanticamente; adicionar enforcement ausente |
| `contas_pagar_pessoais_grupo_metadados` | estrutura compatível; policies `meta_*` em homologação versus `cpp_grupo_meta_*` na referência; falta `comercial_modulo_v1` | preservar policies equivalentes; não substituir por nome |
| `contas_pagar_pessoais_pagamento_eventos` | colunas, FKs, CHECKs e trigger diferido presentes; 6 índices em homologação versus 9 na referência; faltam 3 índices e policy de módulo; nomes de policies divergem | preservar eventos/constraints; adicionar somente índices comprovadamente ausentes e enforcement |
| `despesas` | faltam `categoria_id`, `classificacao_financeira`, FK de categoria, trigger de validação de categoria, 2 índices e policy de módulo | evolução aditiva; preservar materialização, eventos e ownership |
| `empresas` | 4 colunas em homologação versus 20 na referência; faltam 16 campos comerciais/administrativos/plano/cobrança, 1 FK, 2 CHECKs, 1 índice, 1 trigger, policies INSERT/UPDATE | preservar 3 registros; defaults neutros/nulabilidade compatível; nunca copiar valores reais |
| `usuarios` | 10 colunas em homologação versus 29 na referência; faltam 19 campos de permissões legadas/cobrança/contexto; homologação tem 2 FKs e referência 1 | preservar 3 registros e FK adicional mais restritiva; adicionar campos necessários; não copiar Auth |

Contagens de dados de teste a preservar no snapshot aprovado: `empresas=3`, `usuarios=3`, `contas_fixas=10`, `despesas=11`, `contas_pagar_pessoais=17`, `entradas=2`, `grupo_metadados=1`, `pagamento_eventos=10`.

## 12. Objetos a preservar

- as oito tabelas acima e todos os seus dados de teste;
- PKs, FKs e CHECKs existentes que sejam compatíveis ou mais restritivos;
- policies semanticamente equivalentes, mesmo com nomes diferentes;
- os seis triggers existentes, incluindo o trigger diferido de eventos;
- as cinco RPCs pessoais existentes e suas assinaturas;
- as cinco migrations já registradas em homologação;
- a FK adicional de `usuarios` enquanto não houver incompatibilidade comprovada;
- histórico próprio de homologação.

## 13. Objetos que não entram

- `_cf_tenant_batch_karla_ce1`, `_cf_tenant_batch_mauro_a_becf` e qualquer `_cf_*`;
- `relatorio_anual`, `relatorio_mensal` e outras views sem consumidor confirmado;
- `provisionar_conta_v1` nesta etapa;
- funções internas sem consumidor/dependência comprovada;
- grants excessivos ou EXECUTE público de produção;
- dados, Auth, Edge Functions, Storage, secrets, seeds e backfills;
- passos intermediários/obsoletos das migrations históricas;
- renomeações cosméticas de constraints, policies ou índices equivalentes.

## 14. Consultas de verificação

- Preflight: `docs/homologacao/01_PREFLIGHT_SOMENTE_LEITURA.sql`.
- Pós-validação: `docs/homologacao/02_POS_VALIDACAO_SOMENTE_LEITURA.sql`.

Ambos começam com `BEGIN READ ONLY`, definem `statement_timeout` e terminam em `ROLLBACK`. Não contêm DDL, DML, chamadas de função de negócio ou acesso a dados de domínio.

## 15. Critérios de aprovação para a próxima etapa

Só preparar migration após revisão humana confirmar:

- alvo `toiehtfotpjwjslpwdff` e nunca `leissgrymkxakjvurric`;
- catálogo de colunas/constraints/índices/triggers/policies/RPCs exportado pelos blocos C01–C10;
- definições divergentes das oito tabelas resolvidas por semântica;
- zero DML/backfill e zero dado real no futuro SQL;
- allowlist de grants e EXECUTE aprovada;
- plano de backup/rollback de homologação aprovado;
- decisão separada sobre a divergência `provisionar_conta_v1`.
