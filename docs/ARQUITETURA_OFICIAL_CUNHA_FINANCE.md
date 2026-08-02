# Arquitetura Oficial do Cunha Finance

## Objetivo

O Cunha Finance será uma plataforma SaaS de gestão comercial, operacional e financeira para empresas do setor de alumínio. A operação inicial será a Cunha Empreendimentos em Alumínio, sem exceções arquiteturais que impeçam a entrada futura de outras empresas.

## Princípios

- Todo dado empresarial deverá pertencer obrigatoriamente a uma empresa por `empresa_id`.
- O isolamento entre empresas deverá existir na aplicação e no banco, por RLS.
- Relacionamentos deverão impedir referências entre registros de empresas diferentes.
- Operações críticas deverão ser auditáveis, transacionais e validadas no servidor.
- Sugestões de IA dependerão de revisão humana antes de produzirem efeitos.

Cada empresa contratante possuirá dados, catálogo, estoque, preços, clientes, fornecedores, vendedores, usuários, permissões, identidade visual, modelos de orçamento, relatórios e configurações próprios. Os módulos disponíveis serão determinados pelo plano contratado, sem enfraquecer o isolamento entre empresas.

## Módulos

1. Identidade, empresas, usuários e permissões.
2. Dashboard operacional.
3. CRM, clientes, fornecedores e prospecção.
4. Catálogo Inteligente.
5. Estoque.
6. Compras.
7. Orçamento Inteligente.
8. Vendas e pedidos.
9. Financeiro, contas a pagar, contas a receber e fluxo de caixa.
10. Processamento documental.
11. Painel Executivo e relatórios.
12. IA Comercial.
13. Master Admin e operação SaaS.
14. Financeiro Pessoal opcional.
15. Indicadores de Mercado.

O Catálogo Inteligente será o núcleo compartilhado por estoque, compras, vendas, orçamentos, documentos e IA.

## Central de Importações

A plataforma terá uma Central de Importações comum aos fluxos documentais. Ao enviar PDF, Excel, CSV, imagem, catálogo de fornecedor, lista de produtos ou lista de estoque, o usuário deverá escolher uma finalidade: atualizar catálogo, atualizar estoque, criar orçamento, criar pedido de compra, comparar preços ou apenas analisar.

A finalidade selecionada determinará o fluxo de revisão, mas nenhum dado extraído por IA ou OCR poderá ser gravado definitivamente sem conferência e aprovação humanas.

## Arquitetura modular

O sistema deverá começar como monólito modular, com limites explícitos entre domínios. Cada módulo concentrará seus contratos, regras, validações, componentes, serviços e acesso a dados.

```text
src/
  app/             # inicialização, rotas, providers e layouts
  modules/         # domínios independentes
  components/      # componentes visuais compartilhados
  services/        # integrações e infraestrutura
  repositories/    # persistência por domínio
  schemas/         # validação de entradas e payloads
  hooks/           # comportamentos reutilizáveis
  types/           # contratos TypeScript
  permissions/     # autorização da interface
  reports/         # PDF e planilhas
  lib/             # utilitários sem regra de negócio
```

A evolução deverá adotar React, TypeScript e React Router, com serviços, repositórios, validações e testes unitários, de integração e de autorização.

## Plataforma, empresas e Master Admin

Dados da plataforma incluem empresas, planos, limites, consumo e auditoria administrativa. Dados comerciais incluem clientes, catálogos, estoque, propostas, pedidos e financeiro. Esses contextos deverão permanecer separados.

O Master Admin administra empresas, planos, limites e funcionamento do SaaS, mas não recebe acesso indiscriminado aos dados comerciais. Suporte excepcional deverá ser autorizado, limitado, temporário e auditado. E-mail fixo ou condição no frontend não constitui autorização.

## Planos e módulos

Os planos poderão habilitar ou desabilitar Catálogo Inteligente, Orçamento Inteligente, Estoque, CRM, Prospecção, IA Comercial, Painel Executivo, Financeiro Empresarial, Financeiro Pessoal e Relatórios avançados. A Cunha Empreendimentos em Alumínio terá inicialmente todos os módulos habilitados, inclusive o Financeiro Pessoal.

O Financeiro Pessoal permanecerá separado dos dados empresariais e poderá conter receitas, despesas, contas pessoais, cartões, empréstimos, parcelamentos, metas, fluxo de caixa e relatórios pessoais. Seu acesso não será inferido apenas pelo vínculo com a empresa.

## Painel do Vendedor

Conforme suas permissões, cada vendedor visualizará clientes, oportunidades, orçamentos, pedidos, vendas, metas, comissões, propostas aguardando retorno, histórico de atendimento e desempenho individual.

## Painel Executivo

Cada empresa terá indicadores de faturamento diário, mensal e anual, vendas por vendedor, metas individuais e empresariais, conversão de orçamentos, ticket médio, margem, comissão prevista e paga, clientes novos e inativos, produtos mais vendidos, vendas por cliente, região e período, propostas pendentes, vencidas, aprovadas e perdidas, motivos de perda, estoque comprometido, pedidos em atraso e comparações por período. Haverá gráficos por vendedor, relatórios em PDF e Excel ou planilha e filtros por período, vendedor, equipe, produto, cliente, região e filial.

As métricas deverão ter definições versionadas e fontes rastreáveis.

## Indicadores de Mercado

O módulo de Indicadores de Mercado concentrará dólar comercial e LME do alumínio, suas variações diária, semanal e mensal, data e hora da atualização, fonte e histórico em gráfico. Deverá prever atualização automática futura e atualização manual autorizada, simulação de impacto sobre preços e margens e alertas de variação.

As cotações serão dados de referência, segregados por fonte e momento de apuração. Cada orçamento registrará uma cópia imutável da cotação efetivamente utilizada, evitando que atualizações posteriores alterem cálculos já emitidos.

## Segurança operacional

Operações administrativas sensíveis, segredos, concessão de privilégios, processamento confiável de documentos, transações compostas e integrações externas não poderão ser executados diretamente pelo frontend. Deverão utilizar uma camada segura de servidor com autenticação, autorização, validação, idempotência e auditoria.

Políticas RLS e alterações de esquema deverão ser versionadas. Documentos ficarão em armazenamento privado. Transações deverão proteger vínculos entre empresas diferentes e toda ação crítica manterá rastreabilidade.

## Diretriz visual

A interface deverá ter aparência corporativa e premium, dark mode elegante, sidebar fixa e conteúdo centralizado. Deverá evitar rolagem horizontal e reduzir rolagem vertical desnecessária, utilizando cards executivos, tabelas profissionais, filtros organizados, tipografia limpa, ícones consistentes, componentes reutilizáveis e responsividade. A referência é um ERP empresarial, não um conjunto de formulários simples.
