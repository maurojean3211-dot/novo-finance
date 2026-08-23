# Arquitetura proposta — Lançar por Foto/PDF/Print

Status: **proposta técnica local; nenhuma implementação, migration ou integração externa executada**.

## Objetivo e limites

Disponibilizar futuramente a ação **Lançar por Foto/PDF/Print** nos domínios Financeiro Pessoal e Financeiro Empresarial, compartilhando infraestrutura de upload e extração, mas nunca o contrato de persistência nem a autorização de destino.

Esta proposta não cria bucket, tabela, policy, Edge Function, credencial, RPC ou componente. Também não envia documentos reais a terceiros e não altera dados existentes.

## Auditoria do estado atual

### Financeiro Pessoal

- `ReceitasPessoaisPage.jsx` e `DespesasPessoaisPage.jsx` persistem em `public.despesas`, diferenciadas por `tipo` e filtradas por `empresa_id`.
- `ContasPagarPessoaisPage.jsx` usa `public.contas_pagar_pessoais`, com `empresa_id`, `proprietario_id` e RPCs próprias para operações financeiras.
- `PersonalModulePreview.jsx` e `PersonalFinanceHeader` já concentram cabeçalho, ação principal, feedback, métricas e tabela.
- Não existe upload, análise documental ou importação de extrato no núcleo pessoal.

### Financeiro Empresarial

- `FinanceiroCorporativoPage.jsx` possui abas de visão geral, contas a pagar, contas a receber, fluxo, integrações, conciliação e histórico.
- Novos títulos são gravados por `registrar_titulo_financeiro`; baixas, edições e conciliações usam RPCs próprias.
- `financeiro.service.js` sempre envia `empresa_id` para as RPCs corporativas.
- Não existe tabela empresarial genérica de despesas exposta por esse módulo. Um documento empresarial só poderá gerar um destino já suportado, como título a pagar ou receber, até existir contrato específico aprovado.
- Não existe upload, OCR ou importação de extrato no núcleo corporativo.

### Infraestrutura documental existente

- `ARQUITETURA_OFICIAL_CUNHA_FINANCE.md` já define Central de Importações, armazenamento privado, processamento seguro fora do frontend e aprovação humana obrigatória.
- `CATALOGO_E_ORCAMENTO_INTELIGENTE.md` define o fluxo arquivo → extração → normalização → correspondência → revisão → aprovação.
- `document-processing.service.js` é apenas demonstrativo e não deve ser reaproveitado como processador real.

## Regra arquitetural central

O arquivo pode passar por infraestrutura compartilhada, mas cada importação nasce com um contexto imutável:

```text
contexto = PESSOAL
  empresa_id + proprietario_id + módulo pessoal + destino pessoal

contexto = EMPRESARIAL
  empresa_id + usuário solicitante + módulo contratado + destino corporativo
```

Uma importação pessoal nunca poderá mudar para empresarial, e vice-versa. Se o usuário escolheu o contexto errado, deverá cancelar o lote e iniciar outro. Não haverá ação de “mover” ou reaproveitar o mesmo documento entre domínios.

## Fluxo de experiência

1. Usuário aciona **Lançar por Foto/PDF/Print** dentro de uma tela financeira.
2. O sistema exibe o contexto em destaque e exige confirmação:
   - `Financeiro Pessoal — usuário autenticado`; ou
   - `Financeiro Empresarial — nome da empresa ativa`.
3. Usuário escolhe arquivo e finalidade permitida no contexto.
4. O arquivo é validado e enviado para área privada de quarentena.
5. Uma função de servidor cria o trabalho de extração e valida novamente usuário, tenant, proprietário e permissão do módulo.
6. OCR/parser produz sugestões; nenhuma tabela financeira é alterada.
7. O usuário revisa campos e, em extratos, marca ou desmarca cada movimentação.
8. O sistema mostra duplicidades e linhas não lançáveis.
9. Após confirmação explícita, um adaptador exclusivo do domínio materializa cada linha de forma transacional e idempotente.
10. O lote registra resultado, destino, IDs criados, falhas e responsável.

Estados mínimos do lote:

```text
CRIADO → QUARENTENA → PROCESSANDO → REVISAO
       → REJEITADO

REVISAO → APROVADO → MATERIALIZANDO → CONCLUIDO
                           └────────→ FALHA_PARCIAL
```

`FALHA_PARCIAL` não autoriza repetição cega: cada linha mantém sua própria chave idempotente e resultado.

## Pontos futuros de interface

### Pessoal

A ação secundária deverá aparecer em Receitas, Despesas e Contas a Pagar. Ela não substituirá os botões atuais de cadastro manual. A implementação recomendada é um componente opcional e aditivo no cabeçalho/toolbar pessoal, sem mudar o comportamento das páginas que não o utilizarem.

### Empresarial

A ação deverá aparecer no Financeiro Corporativo quando a aba ativa aceitar destino documental: Contas a pagar, Contas a receber e Conciliação/importação de extrato em fluxo próprio.

O botão não deve aparecer como um lançador global que possa escolher tabelas arbitrárias. A aba e as permissões limitam as finalidades apresentadas.

## Componentes futuros sugeridos

```text
src/modules/documentos-financeiros/
  components/
    FinancialDocumentImportLauncher.jsx
    FinancialDocumentUploadStep.jsx
    FinancialDocumentReviewStep.jsx
    BankStatementReviewTable.jsx
    DuplicateWarning.jsx
  services/
    financialDocumentUpload.service.js
    financialDocumentJobs.service.js
  schemas/
    financialDocument.schemas.js
  types/
    financialDocument.js

supabase/functions/process-financial-document/
supabase/functions/materialize-financial-document/
```

O módulo compartilhado conhece upload, estado do processamento e contrato de sugestão. Ele não contém `insert` direto nas tabelas financeiras.

## Modelo conceitual — não executar

Uma futura proposta de schema poderá conter:

### `documentos_financeiros_importacoes`

- `id`;
- `contexto` (`PESSOAL` ou `EMPRESARIAL`);
- `empresa_id` obrigatório;
- `proprietario_id` obrigatório no contexto pessoal;
- `solicitante_id` obrigatório;
- `finalidade`;
- `bucket_id` e `object_path`;
- nome original, MIME detectado, tamanho e SHA-256;
- estado, provedor, versão do extrator e timestamps;
- expiração/retenção;
- erro técnico sanitizado.

### `documentos_financeiros_linhas`

- vínculo obrigatório com a importação;
- página/posição e texto original;
- data, descrição, valor, natureza crédito/débito e categoria sugerida;
- confiança por campo;
- `selecionada`, `revisada_por`, `revisada_em`;
- `duplicate_fingerprint` e motivo da duplicidade;
- destino aprovado e `registro_destino_id`;
- chave idempotente única por linha aprovada.

### `documentos_financeiros_auditoria`

Eventos append-only de upload, processamento, revisão, aprovação, rejeição, materialização, falha e expiração. Não armazenar segredo nem conteúdo integral do documento em logs.

Constraints futuras devem impedir contexto pessoal sem `proprietario_id`, contexto empresarial com proprietário pessoal indevido, troca posterior de contexto/tenant/proprietário/objeto, duas materializações para a mesma linha, vínculos entre tenants distintos e destino fora da lista permitida pelo contexto.

## Armazenamento e quarentena

- Usar bucket privado; nunca URL pública permanente.
- Upload e download devem passar pelo Storage API, não por escrita direta no schema `storage`.
- Restringir MIME e tamanho no bucket e repetir validação por magic bytes no servidor.
- Sugestão inicial: imagens JPEG/PNG/WebP e PDF, até 20 MB e 100 páginas; limites finais dependem de custo e teste.
- Rejeitar executáveis, conteúdo ativo, arquivos com extensão/MIME divergentes e PDFs protegidos que não possam ser analisados com segurança.
- O caminho do objeto não é autorização suficiente. A policy deve validar metadados do lote, `auth.uid()`, `empresa_id`, contexto e proprietário.
- Estrutura indicativa: `quarantine/{contexto}/{empresa_id}/{proprietario-ou-corporativo}/{importacao_id}/{uuid}`.
- Acesso por URL assinada deve ser curto e gerado somente após autorização.
- O processador deverá copiar/promover o objeto apenas após validação; arquivos rejeitados permanecem inacessíveis e entram em expiração curta.

## RLS e autorização

Todas as tabelas novas em `public` deverão ter RLS habilitada antes de receber grants.

### Contexto pessoal

Exigir simultaneamente `auth.uid()` autenticado, `proprietario_id = auth.uid()`, vínculo por `usuarios.id = auth.uid()`, `usuarios.empresa_id = importacao.empresa_id` e permissão do módulo Financeiro Pessoal.

### Contexto empresarial

Exigir simultaneamente `auth.uid()` autenticado, vínculo do usuário com a empresa ativa, `usuarios.empresa_id = importacao.empresa_id` no modelo atual e permissão específica do módulo/operação financeira.

O Master Admin não recebe acesso automático ao conteúdo. Suporte excepcional deve ser temporário, explícito e auditado.

Policies devem usar `TO authenticated`, `USING` e `WITH CHECK`. Não usar `user_metadata`, policy `true` ou `SECURITY DEFINER` para contornar RLS.

## Processamento seguro

- O frontend nunca recebe credenciais de OCR/IA nem `service_role`.
- Segredos ficam no ambiente seguro da função/gerenciador de segredos.
- O processador usa contrato versionado e saída JSON validada por schema.
- Conteúdo do documento é dado não confiável; instruções encontradas no arquivo nunca comandam ferramentas ou alteram regras.
- Aplicar timeout, limite de páginas, limite de tokens, rate limit por cliente e orçamento mensal.
- Registrar provedor, modelo/versão, latência, páginas e custo estimado sem registrar conteúdo sensível desnecessário.
- Antes de enviar dados a terceiro, exigir aprovação do fornecedor, contrato de tratamento de dados, região, retenção, treinamento com dados e política de exclusão.

## Adaptadores de persistência

Não haverá uma RPC genérica que receba o nome de uma tabela.

### Adaptador pessoal

- Receita → contrato pessoal com `tipo = 'receita'`.
- Despesa → contrato pessoal com `tipo = 'despesa'`.
- Conta a pagar → `contas_pagar_pessoais`, com `empresa_id` e `proprietario_id`.
- Pagamento ou entrada não deve ser inferido como quitado sem confirmação e sem usar as RPCs/eventos financeiros próprios.

Antes de ativar Receita/Despesa documental, a proposta deverá confirmar como o proprietário é representado na versão então vigente de `public.despesas`; não se deve relaxar RLS para acomodar o importador.

### Adaptador empresarial

- Conta a pagar/receber → `registrar_titulo_financeiro`, preservando `empresa_id` e histórico.
- Não fazer `insert` direto em `financeiro_titulos` se o fluxo normal exige RPC.
- “Despesa empresarial” só poderá mapear para título a pagar ou outro contrato corporativo explicitamente aprovado; não reutilizar `public.despesas`, que pertence ao Financeiro Pessoal.
- Nota fiscal, estoque, compras e vendas exigem adaptadores próprios e ficam fora desta primeira entrega financeira.

Cada adaptador deve revalidar contexto e autorização dentro da transação, não apenas confiar na revisão feita no navegador.

## Extrato bancário com múltiplas linhas

- crédito sugere Receita/Conta a Receber conforme o contexto;
- débito sugere Despesa/Conta a Pagar ou conciliação conforme o contexto;
- saldo inicial, saldo final, saldo anterior, subtotal, total, transporte e limite não são lançamentos;
- estornos e transferências recebem classificação própria e nunca são invertidos silenciosamente;
- todas as linhas começam em revisão, com seleção individual;
- valores, datas e sinais ficam visíveis antes da aprovação;
- páginas e coordenadas permitem voltar ao trecho original;
- um lote pode produzir zero registros quando tudo for duplicado ou não lançável.

## Prevenção de duplicidade e idempotência

1. SHA-256 do arquivo dentro de `contexto + empresa_id + proprietario_id` sinaliza reenvio do mesmo documento.
2. Fingerprint normalizado por linha combina contexto, tenant, proprietário, data, valor, natureza, descrição normalizada e identificador bancário quando houver.
3. Cada linha aprovada recebe chave idempotente única e imutável.
4. O destino grava referência física à linha/importação quando seu schema permitir.
5. A RPC de materialização bloqueia concorrentemente a chave/lote e retorna o resultado anterior quando o payload for idêntico.
6. Mesma chave com payload divergente aborta fail-closed.

Duplicidade provável exige decisão humana; duplicidade exata já materializada não oferece opção de criar novamente sem fluxo excepcional auditado.

## Privacidade e retenção

- Coletar somente o necessário para sugerir o lançamento.
- Mascarar conta, CPF/CNPJ e outros identificadores na interface e nos logs quando não forem essenciais.
- Política inicial para discussão: rejeitados por 7 dias, originais concluídos por 30 dias e metadados/auditoria conforme a política financeira e obrigação legal aplicável.
- Retenção deve ser configurável por cliente/plano e aprovada juridicamente antes da implantação.
- Expiração deve remover o objeto pela Storage API e registrar comprovante técnico; nunca apagar histórico financeiro materializado.
- Permitir exclusão do original sem quebrar a referência e a auditoria do lançamento, quando juridicamente permitido.

## Custo e limites

O custo mensal será composto por armazenamento médio dos originais, egress/download, invocações da camada de servidor, páginas processadas pelo OCR, tokens/modelo de classificação opcional, varredura antimalware e observabilidade.

Referência consultada em 16/08/2026:

- Supabase Pro inclui 100 GB de arquivos; excedente publicado de US$ 0,0213/GB/mês.
- Supabase Pro inclui 2 milhões de invocações de Edge Functions; excedente publicado de US$ 2 por milhão.
- O preço de OCR depende do recurso. Como ordem de grandeza, o exemplo oficial do AWS Textract informa US$ 0,0015/página para texto simples no primeiro milhão e preços maiores para tabelas/formulários.

Esses valores são apenas fotografia de planejamento e devem ser revalidados antes da contratação. O piloto deve medir páginas por documento, reprocessamento, precisão e custo por lançamento aprovado.

## Fases e gates de autorização

### Fase A — protótipo local sem dados reais

- componentes visuais e contrato de revisão com fixtures sintéticas;
- nenhum upload e nenhuma persistência;
- testes de separação de contexto e linhas de extrato.

### Fase B — proposta de backend

- schema, constraints, RLS, grants, bucket privado, retenção e rollback;
- preflight remoto readonly separado;
- revisão de privacidade e custo;
- nenhuma execução sem autorização.

### Fase C — upload em ambiente controlado

- bucket e funções autorizados;
- validação de arquivos e quarentena;
- sem materialização financeira.

### Fase D — extração e revisão

- fornecedor aprovado e credenciais seguras;
- dados sintéticos primeiro;
- métricas de confiança e custo.

### Fase E — materialização por domínio

- ativar um adaptador por vez;
- testes transacionais, idempotência e isolamento;
- pessoal e empresarial em janelas separadas.

## Critérios fail-closed antes de qualquer implantação

- nenhuma policy ampla em destinos, importações ou Storage;
- RLS e grants exatos;
- tenant/proprietário resolvidos pelo banco, não por texto livre do frontend;
- permissões de módulos confirmadas;
- nenhum segredo no bundle;
- bucket privado e limites de upload;
- provedor e retenção aprovados;
- schema de saída validado;
- revisão humana obrigatória;
- idempotência e concorrência testadas;
- testes que provem bloqueio Pessoal → Empresarial, Empresarial → Pessoal, Mauro → Karla e tenant A → tenant B;
- rollback/roll-forward definido antes da execução.

## Arquivos que uma futura implementação provavelmente alterará

- `src/modules/financeiro-pessoal/components/PersonalModulePreview.jsx` ou cabeçalho pessoal, apenas para ação opcional;
- `src/modules/financeiro-pessoal/pages/ReceitasPessoaisPage.jsx`;
- `src/modules/financeiro-pessoal/pages/DespesasPessoaisPage.jsx`;
- `src/modules/financeiro-pessoal/pages/ContasPagarPessoaisPage.jsx`;
- `src/modules/financeiro-corporativo/pages/FinanceiroCorporativoPage.jsx`;
- novo módulo compartilhado `src/modules/documentos-financeiros/`;
- novas propostas versionadas de schema, Storage/RLS e Edge Functions.

Não é necessário alterar `App.jsx`, rotas ou fontes financeiras existentes apenas para adicionar os lançadores dentro das páginas já existentes.

## Referências oficiais

- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Storage schema: https://supabase.com/docs/guides/storage/schema/design
- Supabase pricing: https://supabase.com/pricing
- AWS Textract pricing: https://aws.amazon.com/textract/pricing/

## Classificação

**ARQUITETURA LOCAL PREPARADA — AGUARDANDO AUTORIZAÇÃO PARA PROTÓTIPO VISUAL OU PROPOSTA DE BACKEND**.
